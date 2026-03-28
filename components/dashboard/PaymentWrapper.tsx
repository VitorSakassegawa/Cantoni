'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PaymentBrick from './PaymentBrick'
import CopiarPixBtn from './CopiarPixBtn'
import { CreditCard } from 'lucide-react'

interface PaymentWrapperProps {
  paymentId: string
  amount: number
  email: string
  nome: string
  hasPixGenerated?: boolean
  pixQrCodeBase64?: string | null
  pixCopyPaste?: string | null
}

export default function PaymentWrapper({
  paymentId,
  amount,
  email,
  nome,
  hasPixGenerated = false,
  pixQrCodeBase64,
  pixCopyPaste,
}: PaymentWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pixImageSrc = pixQrCodeBase64
    ? pixQrCodeBase64.startsWith('data:')
      ? pixQrCodeBase64
      : `data:image/png;base64,${pixQrCodeBase64}`
    : null

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-10 min-w-[156px] justify-center rounded-xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {hasPixGenerated ? 'Ver PIX' : 'Pagar Agora'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[95vh] overflow-hidden rounded-[2.5rem] border-none bg-white p-0 flex flex-col">
          <div className="h-2 w-full flex-shrink-0 bg-blue-600" />
          <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-2xl font-black tracking-tighter text-slate-900">
                {hasPixGenerated ? 'Seu PIX' : 'Finalizar Pagamento'}
              </DialogTitle>
              <DialogDescription className="text-center text-sm font-medium text-slate-500">
                {hasPixGenerated
                  ? 'Seu QR Code já foi gerado. Escaneie novamente ou copie o código PIX abaixo.'
                  : 'Escolha a melhor forma de pagamento para sua mensalidade.'}
              </DialogDescription>
            </DialogHeader>

            {hasPixGenerated && (pixImageSrc || pixCopyPaste) ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-slate-100 bg-slate-50/70 p-6 sm:flex-row sm:items-center sm:justify-center">
                  {pixImageSrc ? (
                    <Image
                      src={pixImageSrc}
                      alt="QR Code PIX"
                      width={176}
                      height={176}
                      unoptimized
                      className="h-44 w-44 rounded-2xl border-4 border-white bg-white shadow-xl"
                    />
                  ) : null}

                  <div className="w-full max-w-sm space-y-4 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Escaneie para pagar com PIX
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-slate-500">
                      Assim que o Mercado Pago confirmar a compensação, o status da parcela será atualizado automaticamente.
                    </p>
                    {pixCopyPaste ? <CopiarPixBtn codigo={pixCopyPaste} /> : null}
                  </div>
                </div>
              </div>
            ) : (
              <PaymentBrick
                amount={amount}
                paymentId={paymentId}
                email={email}
                nome={nome}
                onSuccess={() => {
                  setIsOpen(false)
                  window.location.reload()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
