import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ExternalSignatureStatus } from '@/lib/document-issuances'

const ALLOWED_STATUSES = new Set<ExternalSignatureStatus>([
  'internal_only',
  'pending_external_signature',
  'sent_to_provider',
  'signed_externally',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') {
    return NextResponse.json(
      { error: 'Apenas professores podem atualizar este status' },
      { status: 403 }
    )
  }

  const { issuanceId, externalSignatureStatus, externalSignatureNotes } = await request.json()
  const parsedIssuanceId = Number.parseInt(String(issuanceId), 10)

  if (!Number.isFinite(parsedIssuanceId) || parsedIssuanceId <= 0) {
    return NextResponse.json({ error: 'Documento inválido' }, { status: 400 })
  }

  if (!ALLOWED_STATUSES.has(externalSignatureStatus)) {
    return NextResponse.json(
      { error: 'Status de assinatura externa inválido' },
      { status: 400 }
    )
  }

  const patch: Record<string, unknown> = {
    external_signature_status: externalSignatureStatus,
    external_signature_notes: String(externalSignatureNotes || '').trim() || null,
  }

  if (externalSignatureStatus === 'sent_to_provider') {
    patch.external_signature_sent_at = new Date().toISOString()
  }

  if (externalSignatureStatus === 'signed_externally') {
    patch.external_signed_at = new Date().toISOString()
  }

  const { data: issuance, error } = await supabase
    .from('document_issuances')
    .update(patch)
    .eq('id', parsedIssuanceId)
    .select('id, contract_id, student_id')
    .single()

  if (error || !issuance) {
    return NextResponse.json(
      { error: error?.message || 'Falha ao atualizar documento' },
      { status: 500 }
    )
  }

  revalidatePath(`/documentos/emitidos/${parsedIssuanceId}`)
  revalidatePath('/aluno/documentos')
  revalidatePath('/professor')
  if (issuance.student_id) {
    revalidatePath(`/professor/alunos/${issuance.student_id}`)
  }

  return NextResponse.json({ success: true })
}
