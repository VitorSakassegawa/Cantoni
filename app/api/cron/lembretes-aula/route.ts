import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { enviarLembreteAula } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'
import { addHours } from 'date-fns'

// This endpoint is called by Supabase pg_cron or an external cron service
// Protect it with a secret token
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-cron-secret')
  if (token !== process.env.INFINITEPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const in24h = addHours(now, 24)
  const in25h = addHours(now, 25)

  // Aulas nas próximas 24-25h ainda não notificadas
  const { data: aulas } = await supabase
    .from('aulas')
    .select('*, contratos(profiles(full_name, email))')
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', in24h.toISOString())
    .lte('data_hora', in25h.toISOString())
    .eq('homework_notificado', false)

  let sent = 0
  for (const aula of aulas || []) {
    const contrato = aula.contratos as any
    if (!contrato?.profiles) continue

    try {
      await enviarLembreteAula({
        to: contrato.profiles.email,
        nomeAluno: contrato.profiles.full_name,
        dataHora: formatDateTime(aula.data_hora),
        meetLink: aula.meet_link || '',
        homework: aula.homework || undefined,
      })

      await supabase
        .from('aulas')
        .update({ homework_notificado: true })
        .eq('id', aula.id)

      sent++
    } catch (e) {
      console.error('Error sending reminder for aula', aula.id, e)
    }
  }

  return NextResponse.json({ sent })
}
