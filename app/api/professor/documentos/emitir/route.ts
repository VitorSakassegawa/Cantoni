import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDocumentContext } from '@/lib/document-access'
import { buildContractSnapshot, buildDeclarationSnapshot } from '@/lib/documents'
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
    return NextResponse.json({ error: 'Apenas professores podem emitir documentos' }, { status: 403 })
  }

  const { contractId, kind } = await request.json()
  const parsedContractId = Number.parseInt(String(contractId), 10)

  if (!Number.isFinite(parsedContractId) || parsedContractId <= 0) {
    return NextResponse.json({ error: 'Contrato inválido' }, { status: 400 })
  }

  if (kind !== 'contract' && kind !== 'enrollment_declaration') {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
  }

  let context
  try {
    context = await getDocumentContext(parsedContractId, { redirectOnFail: false })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Contrato não encontrado' }, { status: 404 })
  }
  const payload =
    kind === 'contract'
      ? buildContractSnapshot(context)
      : buildDeclarationSnapshot(context)

  const { data: previousIssuances } = await supabase
    .from('document_issuances')
    .select('id, version, status')
    .eq('contract_id', parsedContractId)
    .eq('kind', kind)
    .order('version', { ascending: false })

  const nextVersion = ((previousIssuances?.[0]?.version as number | undefined) || 0) + 1

  await supabase
    .from('document_issuances')
    .update({ status: 'superseded' })
    .eq('contract_id', parsedContractId)
    .eq('kind', kind)
    .eq('status', 'issued')

  const { data: issuance, error: issuanceError } = await supabase
    .from('document_issuances')
    .insert({
      contract_id: parsedContractId,
      student_id: context.contract.aluno_id,
      kind,
      version: nextVersion,
      title: payload.title,
      payload,
      status: 'issued',
      requires_acceptance: kind === 'contract',
      issued_by: user.id,
    })
    .select('id')
    .single()

  if (issuanceError || !issuance) {
    return NextResponse.json({ error: issuanceError?.message || 'Falha ao emitir documento' }, { status: 500 })
  }

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: context.contract.aluno_id,
    contractId: parsedContractId,
    eventType: 'document.issued',
    title: kind === 'contract' ? 'Contrato emitido' : 'Declaração emitida',
    description: `${kind === 'contract' ? 'Contrato' : 'Declaração de matrícula'} emitido(a) na versão ${nextVersion}.`,
    severity: 'info',
    metadata: {
      issuanceId: issuance.id,
      kind,
      version: nextVersion,
    },
  })

  revalidatePath(`/professor/alunos/${context.contract.aluno_id}`)
  revalidatePath('/aluno/documentos')
  revalidatePath(`/documentos/emitidos/${issuance.id}`)

  return NextResponse.json({
    success: true,
    issuanceId: issuance.id,
  })
}
