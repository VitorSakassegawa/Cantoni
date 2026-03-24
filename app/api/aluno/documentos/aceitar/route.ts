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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'aluno') {
    return NextResponse.json({ error: 'Apenas o aluno pode registrar aceite' }, { status: 403 })
  }

  const { issuanceId, acceptanceName } = await request.json()
  const parsedIssuanceId = Number.parseInt(String(issuanceId), 10)

  if (!Number.isFinite(parsedIssuanceId) || parsedIssuanceId <= 0) {
    return NextResponse.json({ error: 'Documento inválido' }, { status: 400 })
  }

  const { data: issuance } = await supabase
    .from('document_issuances')
    .select('id, contract_id, student_id, kind')
    .eq('id', parsedIssuanceId)
    .single()

  if (!issuance) {
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  }

  const { error } = await supabase.rpc('accept_document_issuance', {
    p_issuance_id: parsedIssuanceId,
    p_student_id: user.id,
    p_acceptance_name: String(acceptanceName || profile?.full_name || '').trim(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: issuance.student_id,
    contractId: issuance.contract_id,
    eventType: 'document.accepted',
    title: 'Contrato aceito digitalmente',
    description: 'O aluno registrou o aceite digital do contrato no portal.',
    severity: 'success',
    metadata: {
      issuanceId: parsedIssuanceId,
      kind: issuance.kind,
    },
  })

  revalidatePath('/aluno/documentos')
  revalidatePath(`/documentos/emitidos/${parsedIssuanceId}`)

  return NextResponse.json({ success: true })
}
