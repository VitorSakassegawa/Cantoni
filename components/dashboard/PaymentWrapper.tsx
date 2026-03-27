'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PaymentBrick from './PaymentBrick'
import { CreditCard } from 'lucide-react'

interface PaymentWrapperProps {
  paymentId: string
  amount: number
  email: string
  nome: string
  hasPixGenerated?: boolean
}

export default function PaymentWrapper({
  paymentId,
  amount,
  email,
  nome,
  hasPixGenerated = false,
}: PaymentWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="h-10 px-6 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
      >
        <CreditCard className="w-4 h-4" />
        {hasPixGenerated ? 'Ver PIX' : 'Pagar Agora'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 border-none overflow-hidden rounded-[2.5rem] bg-white max-h-[95vh] flex flex-col">
          <div className="bg-blue-600 h-2 w-full flex-shrink-0" />
          <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter text-center">
                Finalizar Pagamento
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 font-medium text-sm">
                {hasPixGenerated
                  ? 'Seu PIX já foi gerado. Você pode copiar o código ou escanear o QR novamente.'
                  : 'Escolha a melhor forma de pagamento para sua mensalidade.'}
              </DialogDescription>
            </DialogHeader>

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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
