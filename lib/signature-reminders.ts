import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailContratoParaAssinar } from '@/lib/resend'
import { logActivityBestEffort } from '@/lib/activity-log'

type SignatureReminderOptions = {
  minHoursSinceIssue?: number // só lembra contratos emitidos há pelo menos N horas
  minHoursBetween?: number // intervalo mínimo entre lembretes do mesmo contrato
  maxReminders?: number // teto de lembretes por contrato
}

type PendingIssuance = {
  id: number
  contract_id: number
  student_id: string
  created_at: string
}

type StudentProfile = { id: string; email: string | null; full_name: string | null }

const REMINDER_EVENT = 'document.signature_reminder'

export async function runSignatureReminders(options: SignatureReminderOptions = {}) {
  const supabase = await createServiceClient()
  const now = Date.now()
  const minHoursSinceIssue = options.minHoursSinceIssue ?? 48
  const minHoursBetween = options.minHoursBetween ?? 20
  const maxReminders = options.maxReminders ?? 3

  const issuedBefore = new Date(now - minHoursSinceIssue * 3600_000).toISOString()

  // Documentos de contrato emitidos e ainda NÃO aceitos.
  const { data: pending, error } = await supabase
    .from('document_issuances')
    .select('id, contract_id, student_id, created_at')
    .eq('kind', 'contract')
    .eq('status', 'issued')
    .eq('requires_acceptance', true)
    .lte('created_at', issuedBefore)

  if (error) {
    throw new Error(error.message)
  }

  const list = (pending || []) as PendingIssuance[]

  const studentIds = [...new Set(list.map((item) => item.student_id).filter(Boolean))]
  const { data: profiles } = studentIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', studentIds)
    : { data: [] as StudentProfile[] }
  const profileMap = new Map((profiles as StudentProfile[] | null || []).map((p) => [p.id, p]))

  let sent = 0
  let skipped = 0
  const details: Array<{ issuanceId: number; status: 'sent' | 'skipped'; reason?: string }> = []

  for (const issuance of list) {
    const profile = profileMap.get(issuance.student_id)
    if (!profile?.email) {
      skipped += 1
      details.push({ issuanceId: issuance.id, status: 'skipped', reason: 'missing_student_email' })
      continue
    }

    // Dedup + teto via activity_logs (sem coluna extra no banco).
    const { data: reminderLogs } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('contract_id', issuance.contract_id)
      .eq('event_type', REMINDER_EVENT)
      .order('created_at', { ascending: false })

    const logs = reminderLogs || []
    if (logs.length >= maxReminders) {
      skipped += 1
      details.push({ issuanceId: issuance.id, status: 'skipped', reason: 'max_reminders_reached' })
      continue
    }
    const lastAt = logs[0]?.created_at
    if (lastAt && now - new Date(lastAt).getTime() < minHoursBetween * 3600_000) {
      skipped += 1
      details.push({ issuanceId: issuance.id, status: 'skipped', reason: 'recently_reminded' })
      continue
    }

    try {
      await enviarEmailContratoParaAssinar({
        to: profile.email,
        nomeAluno: profile.full_name || 'Aluno',
        issuanceId: issuance.id,
        isReminder: true,
      })

      await logActivityBestEffort({
        targetUserId: issuance.student_id,
        contractId: issuance.contract_id,
        eventType: REMINDER_EVENT,
        title: 'Lembrete de assinatura enviado',
        description: `Lembrete de assinatura do contrato (documento #${issuance.id}) enviado ao aluno.`,
        severity: 'info',
        metadata: { issuanceId: issuance.id },
      })

      sent += 1
      details.push({ issuanceId: issuance.id, status: 'sent' })
    } catch (sendError) {
      console.error('Signature reminder send failed for issuance', issuance.id, sendError)
      skipped += 1
      details.push({ issuanceId: issuance.id, status: 'skipped', reason: 'email_delivery_failed' })
    }
  }

  return { checked: list.length, sent, skipped, details }
}
