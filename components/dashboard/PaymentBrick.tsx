'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface PaymentBrickProps {
  amount: number
  paymentId: string // ID do banco local (pagamento_id)
  email?: string
  nome?: string
  onSuccess?: () => void
}

declare global {
  interface Window {
    MercadoPago: any
  }
}

export default function PaymentBrick({ amount, paymentId, email, nome, onSuccess }: PaymentBrickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<any>(null)
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

      const renderPaymentBrick = async (bricksBuilder: any) => {
        // Clear container to avoid duplicates
        if (containerRef.current) containerRef.current.innerHTML = ''

        const settings = {
          initialization: {
            amount: amount,
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
            onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
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

                const result = await response.json()

                if (response.ok) {
                  toast.success('Pagamento processado com sucesso!')
                  if (onSuccess) onSuccess()
                } else {
                  throw new Error(result.error || 'Erro ao processar pagamento')
                }
              } catch (error: any) {
                toast.error(error.message)
                console.error('MP Brick Error:', error)
              }
            },
            onError: (error: any) => {
              console.error('Payment Brick Error:', error)
              toast.error('Erro ao carregar o checkout do Mercado Pago.')
              setLoading(false)
            },
          },
        }

        try {
          controllerRef.current = await bricksBuilder.create(
            'payment',
            'paymentBrick_container',
            settings
          )
        } catch (error) {
          console.error('Bricks creation error:', error)
        }
      }

      renderPaymentBrick(bricksBuilder)
    }

    return () => {
      if (controllerRef.current) {
        try {
          controllerRef.current.unmount()
          controllerRef.current = null
        } catch (e) {
          console.error('Unmount error:', e)
        }
      }
    }
  }, [sdkLoaded, amount, paymentId, email, nome])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onLoad={() => setSdkLoaded(true)}
        strategy="afterInteractive"
      />
      
      {loading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando Mercado Pago...</p>
        </div>
      )}

      <div id="paymentBrick_container" ref={containerRef} />
    </div>
  )
}
