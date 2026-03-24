import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivityBestEffort } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json(
      { error: 'Apenas professores podem renegociar contratos' },
      { status: 403 }
    )
  }

  const {
    contractId,
    alunoId,
    newOpenValue,
    newInstallments,
    firstDueDate,
    paymentMethod,
    notes,
  } = await request.json()

  const parsedContractId = Number.parseInt(String(contractId), 10)
  const parsedOpenValue = Number.parseFloat(String(newOpenValue))
  const parsedInstallments = Number.parseInt(String(newInstallments), 10)
  const trimmedPaymentMethod = String(paymentMethod || '').trim()
  const trimmedFirstDueDate = String(firstDueDate || '').trim()
  const trimmedNotes = String(notes || '').trim()

  if (!Number.isFinite(parsedContractId) || parsedContractId <= 0) {
    return NextResponse.json({ error: 'Contrato inválido' }, { status: 400 })
  }

  if (!Number.isFinite(parsedOpenValue) || parsedOpenValue < 0) {
    return NextResponse.json({ error: 'Novo saldo em aberto inválido' }, { status: 400 })
  }

  if (!Number.isFinite(parsedInstallments) || parsedInstallments < 1) {
    return NextResponse.json({ error: 'Número de parcelas inválido' }, { status: 400 })
  }

  if (!trimmedFirstDueDate) {
    return NextResponse.json({ error: 'Informe a data da primeira parcela' }, { status: 400 })
  }

  if (!trimmedPaymentMethod) {
    return NextResponse.json({ error: 'Informe a forma de pagamento' }, { status: 400 })
  }

  const { data: contract, error: contractError } = await supabase
    .from('contratos')
    .select('id, aluno_id, valor')
    .eq('id', parsedContractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  }

  const { data: renegotiationResult, error: renegotiationError } = await supabase.rpc(
    'renegotiate_contract_balance',
    {
      p_contract_id: parsedContractId,
      p_actor_user_id: user.id,
      p_new_open_value: parsedOpenValue,
      p_new_installments: parsedInstallments,
      p_first_due_date: trimmedFirstDueDate,
      p_payment_method: trimmedPaymentMethod,
      p_notes: trimmedNotes || null,
    }
  )

  if (renegotiationError) {
    return NextResponse.json({ error: renegotiationError.message }, { status: 400 })
  }

  const result = Array.isArray(renegotiationResult) ? renegotiationResult[0] : renegotiationResult

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: alunoId || contract.aluno_id,
    contractId: parsedContractId,
    eventType: 'contract.renegotiated',
    title: 'Saldo renegociado',
    description: `O saldo do contrato foi renegociado para ${parsedInstallments} parcela(s), com novo aberto de R$ ${parsedOpenValue.toFixed(2)}.`,
    severity: 'warning',
    metadata: {
      previousContractValue: contract.valor,
      paidValue: result?.paid_value ?? null,
      previousOpenValue: result?.previous_open_value ?? null,
      newTotalValue: result?.new_total_value ?? null,
      newOpenValue: parsedOpenValue,
      newInstallments: parsedInstallments,
      firstDueDate: trimmedFirstDueDate,
      paymentMethod: trimmedPaymentMethod,
      notes: trimmedNotes || null,
    },
  })

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contract.aluno_id}`)
  revalidatePath(`/professor/alunos/${contract.aluno_id}/contrato/editar?id=${parsedContractId}`)
  revalidatePath('/aluno')
  revalidatePath('/aluno/pagamentos')

  return NextResponse.json({ success: true })
}
