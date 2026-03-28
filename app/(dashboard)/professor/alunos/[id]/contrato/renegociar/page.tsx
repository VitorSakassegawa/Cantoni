import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ContratoRenegociacaoForm from '@/components/dashboard/ContratoRenegociacaoForm'
import { createClient } from '@/lib/supabase/server'
import type { RenegotiationPaymentSummary } from '@/lib/dashboard-types'

export default async function ProfessorRenegociarContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id: alunoId } = await params
  const resolvedSearchParams = await searchParams
  const contractIdParam = Array.isArray(resolvedSearchParams.id)
    ? resolvedSearchParams.id[0]
    : resolvedSearchParams.id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    redirect('/aluno')
  }

  let contractQuery = supabase
    .from('contratos')
    .select('id, aluno_id, forma_pagamento, valor')
    .eq('aluno_id', alunoId)

  if (contractIdParam) {
    contractQuery = contractQuery.eq('id', contractIdParam)
  } else {
    contractQuery = contractQuery.eq('status', 'ativo')
  }

  const { data: contract } = await contractQuery.maybeSingle()

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto p-20 text-center">
        <div className="text-slate-400 font-bold italic">Nenhum contrato elegível encontrado para este aluno.</div>
        <Link href={`/professor/alunos/${alunoId}`} className="mt-4 inline-block text-blue-500 hover:underline">
          Voltar
        </Link>
      </div>
    )
  }

  const { data: payments } = await supabase
    .from('pagamentos')
    .select('id, status, valor, data_vencimento')
    .eq('contrato_id', contract.id)
    .order('parcela_num')

  const paymentList = (payments as RenegotiationPaymentSummary[] | null | undefined) || []
  const paidPayments = paymentList.filter((payment) => payment.status === 'pago')
  const openPayments = paymentList.filter((payment) => payment.status !== 'pago')

  if (paidPayments.length === 0 || openPayments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-20 text-center">
        <div className="text-slate-400 font-bold italic">
          Este contrato só pode ser renegociado quando já houver ao menos uma parcela paga e outra em aberto.
        </div>
        <Link href={`/professor/alunos/${alunoId}`} className="mt-4 inline-block text-blue-500 hover:underline">
          Voltar
        </Link>
      </div>
    )
  }

  const paidValue = paidPayments.reduce((total, payment) => total + Number(payment.valor || 0), 0)
  const currentOpenValue = openPayments.reduce((total, payment) => total + Number(payment.valor || 0), 0)
  const firstOpenDueDate = openPayments[0]?.data_vencimento || ''

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col gap-6">
        <Link
          href={`/professor/alunos/${alunoId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group w-fit"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Aluno
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Renegociação de Contrato</h1>
          <p className="text-slate-500 font-medium italic">
            O histórico já pago é preservado e apenas o saldo em aberto é reorganizado.
          </p>
        </div>
      </div>

      <ContratoRenegociacaoForm
        alunoId={alunoId}
        contractId={contract.id}
        paidValue={paidValue}
        currentOpenValue={currentOpenValue}
        currentOpenInstallments={openPayments.length}
        currentPaymentMethod={contract.forma_pagamento}
        firstOpenDueDate={firstOpenDueDate}
      />
    </div>
  )
}
