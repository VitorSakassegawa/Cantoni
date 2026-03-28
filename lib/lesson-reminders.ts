import 'server-only'
import { addHours } from 'date-fns'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarLembreteAula } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'

type ReminderContractProfile = {
  full_name?: string | null
  email?: string | null
}

type ReminderLesson = {
  id: number
  data_hora: string
  meet_link?: string | null
  homework?: string | null
  has_homework?: boolean | null
  homework_type?: string | null
  homework_link?: string | null
  homework_due_date?: string | null
  contratos?:
    | {
        profiles?: ReminderContractProfile | ReminderContractProfile[] | null
      }
    | {
        profiles?: ReminderContractProfile | ReminderContractProfile[] | null
      }[]
    | null
}

export async function runLessonReminders() {
  const supabase = await createServiceClient()
  const now = new Date()
  const in24h = addHours(now, 24)
  const in25h = addHours(now, 25)

  const { data: aulas, error } = await supabase
    .from('aulas')
    .select('*, contratos(profiles(full_name, email))')
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', in24h.toISOString())
    .lte('data_hora', in25h.toISOString())
    .eq('reminder_sent', false)

  if (error) {
    throw new Error(error.message)
  }

  let sent = 0
  let skipped = 0
  const details: Array<{ lessonId: number; status: 'sent' | 'skipped'; reason?: string }> = []

  for (const aula of (aulas || []) as ReminderLesson[]) {
    const rawContract = Array.isArray(aula.contratos) ? (aula.contratos[0] ?? null) : (aula.contratos ?? null)
    const profile = Array.isArray(rawContract?.profiles)
      ? (rawContract.profiles[0] ?? null)
      : (rawContract?.profiles ?? null)

    if (!profile?.email) {
      skipped += 1
      details.push({ lessonId: aula.id, status: 'skipped', reason: 'missing_student_email' })
      continue
    }

    try {
      await enviarLembreteAula({
        to: profile.email,
        nomeAluno: profile.full_name || 'Aluno',
        dataHora: formatDateTime(aula.data_hora),
        meetLink: aula.meet_link || '',
        homework: aula.homework || undefined,
        has_homework: aula.has_homework ?? undefined,
        homeworkType: aula.homework_type ?? undefined,
        homeworkLink: aula.homework_link ?? undefined,
        homeworkDueDate: aula.homework_due_date ? formatDateTime(aula.homework_due_date) : undefined,
      })

      await supabase.from('aulas').update({ reminder_sent: true }).eq('id', aula.id)
      sent += 1
      details.push({ lessonId: aula.id, status: 'sent' })
    } catch (sendError) {
      console.error('Error sending reminder for aula', aula.id, sendError)
      skipped += 1
      details.push({ lessonId: aula.id, status: 'skipped', reason: 'email_delivery_failed' })
    }
  }

  return {
    checked: (aulas || []).length,
    sent,
    skipped,
    details,
  }
}
