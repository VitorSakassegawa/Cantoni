import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { addHours } from 'date-fns'
import { enviarLembreteAula } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'
import { getCronSecret } from '@/lib/env'

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
  contratos?: {
    profiles?: ReminderContractProfile | ReminderContractProfile[] | null
  } | {
    profiles?: ReminderContractProfile | ReminderContractProfile[] | null
  }[] | null
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-cron-secret')
  if (token !== getCronSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const in24h = addHours(now, 24)
  const in25h = addHours(now, 25)

  const { data: aulas } = await supabase
    .from('aulas')
    .select('*, contratos(profiles(full_name, email))')
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', in24h.toISOString())
    .lte('data_hora', in25h.toISOString())
    .eq('homework_notificado', false)

  let sent = 0
  for (const aula of (aulas || []) as ReminderLesson[]) {
    const rawContract = Array.isArray(aula.contratos) ? (aula.contratos[0] ?? null) : (aula.contratos ?? null)
    const profile = Array.isArray(rawContract?.profiles) ? (rawContract.profiles[0] ?? null) : (rawContract?.profiles ?? null)
    if (!profile?.email) {
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
        homeworkDueDate: aula.homework_due_date
          ? formatDateTime(aula.homework_due_date)
          : undefined,
      })

      await supabase.from('aulas').update({ homework_notificado: true }).eq('id', aula.id)
      sent += 1
    } catch (error) {
      console.error('Error sending reminder for aula', aula.id, error)
    }
  }

  return NextResponse.json({ sent })
}
