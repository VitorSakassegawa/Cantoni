import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { getDocumentContext } from '@/lib/document-access'
import { buildContractSnapshot } from '@/lib/documents'
import { generateDocumentHash } from '@/lib/document-audit'

type IssueResult = {
  issuanceId: number
  version: number
  studentId: string | null
  studentEmail: string | null
  studentName: string | null
}

// Emite (ou re-emite, bumpando a versão) o documento de CONTRATO que exige aceite,
// reaproveitando o mesmo pipeline da emissão manual (snapshot + hash + RPC).
export async function issueContractDocument(
  serviceSupabase: Awaited<ReturnType<typeof createServiceClient>>,
  contractId: number,
  issuedByUserId: string
): Promise<IssueResult | null> {
  const context = await getDocumentContext(contractId, {
    redirectOnFail: false,
    viewerUserId: issuedByUserId,
    assumeProfessor: true,
  })

  const payload = buildContractSnapshot(context)
  const contentHash = generateDocumentHash(payload)

  const { data, error } = await serviceSupabase.rpc('issue_document_issuance_v1', {
    p_contract_id: contractId,
    p_student_id: context.contract.aluno_id,
    p_kind: 'contract',
    p_title: payload.title,
    p_payload: payload,
    p_content_hash: contentHash,
    p_requires_acceptance: true,
    p_issued_by: issuedByUserId,
  })

  const issuance = (data as Array<{ issuance_id: number; version: number }> | null)?.[0]
  if (error || !issuance) {
    if (error) console.error('issueContractDocument rpc error:', error.message)
    return null
  }

  return {
    issuanceId: issuance.issuance_id,
    version: issuance.version,
    studentId: context.contract.aluno_id ?? null,
    studentEmail: context.student?.email ?? null,
    studentName: context.student?.full_name ?? null,
  }
}
