'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { toast } from 'sonner'

interface PaymentBrickProps {
  amount: number
  paymentId: string
  email?: string
  nome?: string
  onSuccess?: (result?: {
    status?: string
    local_status?: string
    generated_pix?: boolean
    reused_existing_pix?: boolean
  }) => void
}

type PaymentBrickResult = {
  status?: string
  local_status?: string
  generated_pix?: boolean
  reused_existing_pix?: boolean
  reused_existing_attempt?: boolean
  error?: string
}

type PaymentBrickSubmitPayload = {
  selectedPaymentMethod?: string
  formData?: Record<string, unknown>
}

type MercadoPagoBrickController = {
  unmount: () => void
}

type MercadoPagoBricksBuilder = {
  create: (
    brickName: string,
    containerId: string,
    settings: {
      initialization: {
        amount: number
        payer: {
          email: string
          firstName: string
          lastName: string
        }
      }
      customization: Record<string, unknown>
      callbacks: {
        onReady: () => void
        onSubmit: (payload: PaymentBrickSubmitPayload) => Promise<void>
        onError: (error: unknown) => void
      }
    }
  ) => Promise<MercadoPagoBrickController>
}

type MercadoPagoSdk = {
  bricks: () => MercadoPagoBricksBuilder
}

declare global {
  interface Window {
    MercadoPago: new (publicKey: string) => MercadoPagoSdk
  }
}

export default function PaymentBrick({
  amount,
  paymentId,
  email,
  nome,
  onSuccess,
}: PaymentBrickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<MercadoPagoBrickController | null>(null)
  const [loading, setLoading] = useState(true)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  useEffect(() => {
    if (sdkLoaded && containerRef.current && !controllerRef.current) {
      const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

      if (!publicKey) {
        console.error('Mercado Pago Public Key is missing!')
        toast.error('Configuração do Mercado Pago (Public Key) não encontrada no ambiente.')
        setLoading(false)
        return
      }

      const mp = new window.MercadoPago(publicKey)
      const bricksBuilder = mp.bricks()

      const renderPaymentBrick = async (currentBricksBuilder: MercadoPagoBricksBuilder) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        const settings = {
          initialization: {
            amount,
            payer: {
              email: email || '',
              firstName: nome?.split(' ')[0] || '',
              lastName: nome?.split(' ').slice(1).join(' ') || '',
            },
          },
          customization: {
            paymentMethods: {
              ticket: 'all',
              bankTransfer: 'all',
              creditCard: 'all',
              debitCard: 'all',
              mercadoPago: 'all',
            },
            visual: {
              style: {
                theme: 'light',
              },
            },
          },
          callbacks: {
            onReady: () => {
              setLoading(false)
            },
            onSubmit: async ({ selectedPaymentMethod, formData }: PaymentBrickSubmitPayload) => {
              try {
                const response = await fetch('/api/pagamentos/processar-mercadopago', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    formData,
                    paymentId,
                    selectedPaymentMethod,
                  }),
                })

                const result = (await response.json()) as PaymentBrickResult

                if (response.ok) {
                  if (
                    selectedPaymentMethod === 'pix' ||
                    result.generated_pix ||
                    result.reused_existing_pix
                  ) {
                    toast.success(
                      result.reused_existing_pix
                        ? 'PIX já estava gerado. Atualizamos a tela para você continuar o pagamento.'
                        : 'QR Code PIX gerado com sucesso. O status continuará pendente até a compensação.'
                    )
                  } else if (result.reused_existing_attempt) {
                    toast.success(
                      'Já existe uma tentativa de pagamento em processamento para esta parcela.'
                    )
                  } else if (result.local_status === 'pago' || result.status === 'approved') {
                    toast.success('Pagamento aprovado com sucesso!')
                  } else {
                    toast.success(`Pagamento criado com status ${result.status || 'pendente'}.`)
                  }

                  onSuccess?.(result)
                } else {
                  throw new Error(result.error || 'Erro ao processar pagamento')
                }
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Erro ao processar pagamento'
                toast.error(message)
                console.error('MP Brick Error:', error)
              }
            },
            onError: (error: unknown) => {
              console.error('Payment Brick Error:', error)
              toast.error('Erro ao carregar o checkout do Mercado Pago.')
              setLoading(false)
            },
          },
        }

        try {
          controllerRef.current = await currentBricksBuilder.create(
            'payment',
            'paymentBrick_container',
            settings
          )
        } catch (error) {
          console.error('Bricks creation error:', error)
        }
      }

      void renderPaymentBrick(bricksBuilder)
    }

    return () => {
      if (controllerRef.current) {
        try {
          controllerRef.current.unmount()
          controllerRef.current = null
        } catch (error) {
          console.error('Unmount error:', error)
        }
      }
    }
  }, [sdkLoaded, amount, paymentId, email, nome, onSuccess])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onLoad={() => setSdkLoaded(true)}
        strategy="afterInteractive"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 p-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="animate-pulse font-medium text-slate-500">Carregando Mercado Pago...</p>
        </div>
      ) : null}

      <div id="paymentBrick_container" ref={containerRef} />
    </div>
  )
}
