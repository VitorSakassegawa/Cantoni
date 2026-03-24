import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ContratoForm from '@/components/dashboard/ContratoForm'

export default async function ProfessorEditContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id: aluno_id } = await params
  const resolvedSearchParams = await searchParams
  const contratoId = Array.isArray(resolvedSearchParams.id)
    ? resolvedSearchParams.id[0]
    : resolvedSearchParams.id

  const supabase = await createClient()

  let query = supabase.from('contratos').select('*').eq('aluno_id', aluno_id)

  if (contratoId) {
    query = query.eq('id', contratoId)
  } else {
    query = query.eq('status', 'ativo')
  }

  const { data: contrato, error } = await query.maybeSingle()

  if (error || !contrato) {
    return (
      <div className="max-w-4xl mx-auto p-20 text-center">
        <div className="text-slate-400 font-bold italic">Nenhum contrato ativo encontrado para este aluno.</div>
        <Link href={`/professor/alunos/${aluno_id}`} className="mt-4 inline-block text-blue-500 hover:underline">
          Voltar
        </Link>
      </div>
    )
  }

  const { count: paidPaymentsCount } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', contrato.id)
    .eq('status', 'pago')

  const { count: openPaymentsCount } = await supabase
    .from('pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', contrato.id)
    .neq('status', 'pago')

  const contractWithFlags = {
    ...contrato,
    has_paid_payments: (paidPaymentsCount || 0) > 0,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col gap-6">
        <Link
          href={`/professor/alunos/${aluno_id}`}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group w-fit"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para Aluno
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Edição Acadêmica</h1>
          <p className="text-slate-500 font-medium italic">Sincronização automática de pagamentos habilitada.</p>
        </div>
        {contractWithFlags.has_paid_payments && (openPaymentsCount || 0) > 0 && (
          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Fluxo recomendado</p>
            <p className="mt-2 text-sm font-medium text-amber-800/80">
              Este contrato já tem parcelas pagas. Para mudar valor, vencimento ou forma de pagamento do saldo restante, use o aditivo de renegociação.
            </p>
            <Link
              href={`/professor/alunos/${aluno_id}/contrato/renegociar?id=${contrato.id}`}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-amber-500 px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
            >
              Abrir renegociação
            </Link>
          </div>
        )}
      </div>

      <ContratoForm alunoId={aluno_id} initialData={contractWithFlags} />
    </div>
  )
}
