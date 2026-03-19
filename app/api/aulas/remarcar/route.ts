import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { atualizarEventoCalendar, criarEventoMeet, deletarEventoCalendar } from '@/lib/google-calendar'
import { enviarConfirmacaoRemarcacao } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'
import { startOfMonth } from 'date-fns'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { aulaId, novaDataHora } = await request.json()

  const serviceSupabase = await createServiceClient()

  // Buscar aula + contrato + plano + aluno
  const { data: aula } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(*, planos(*), profiles(*))')
    .eq('id', aulaId)
    .single()

  if (!aula) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })

  const contrato = aula.contratos as any
  const plano = contrato.planos
  const aluno = contrato.profiles

  // Verificar permissão
  const isProfessor = aluno.id !== user.id
  if (!isProfessor && contrato.aluno_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Verificar limite de remarcação do mês
  const mes = startOfMonth(new Date(aula.data_hora))
  const mesStr = mes.toISOString().split('T')[0]

  const { data: remarcacao } = await serviceSupabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', contrato.aluno_id)
    .eq('mes', mesStr)
    .single()

  const qtdAtual = remarcacao?.quantidade || 0

  if (!isProfessor && qtdAtual >= plano.remarca_max_mes) {
    return NextResponse.json({
      error: `Limite de ${plano.remarca_max_mes} remarcação(ões)/mês atingido`,
    }, { status: 400 })
  }

  // Criar novo evento no Google Calendar
  let novoEventId = ''
  let novoMeetLink = ''

  try {
    const { eventId, meetLink } = await criarEventoMeet({
      titulo: `Aula de Inglês — ${aluno.full_name}`,
      dataHora: new Date(novaDataHora),
      emailAluno: aluno.email,
      emailProfessor: process.env.RESEND_FROM_EMAIL!,
    })
    novoEventId = eventId
    novoMeetLink = meetLink

    // Deletar evento antigo
    if (aula.google_event_id) {
      await deletarEventoCalendar(aula.google_event_id)
    }
  } catch (e) {
    console.error('Google Calendar error:', e)
  }

  // Marcar aula antiga como remarcada
  await serviceSupabase
    .from('aulas')
    .update({ status: 'remarcada' })
    .eq('id', aulaId)

  // Criar nova aula
  const { data: novaAula } = await serviceSupabase
    .from('aulas')
    .insert({
      contrato_id: aula.contrato_id,
      google_event_id: novoEventId,
      data_hora: novaDataHora,
      duracao_minutos: 45,
      status: 'agendada',
      remarcada_de: aulaId,
      meet_link: novoMeetLink,
    })
    .select()
    .single()

  // Registrar remarcação do mês
  await serviceSupabase
    .from('remarcacoes_mes')
    .upsert({
      aluno_id: contrato.aluno_id,
      mes: mesStr,
      quantidade: qtdAtual + 1,
    }, { onConflict: 'aluno_id,mes' })

  // Enviar email de confirmação
  await enviarConfirmacaoRemarcacao({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    dataAntiga: formatDateTime(aula.data_hora),
    dataNova: formatDateTime(novaDataHora),
    meetLink: novoMeetLink,
  })

  return NextResponse.json({ success: true, novaAula })
}
