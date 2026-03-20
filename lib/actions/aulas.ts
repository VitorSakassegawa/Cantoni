'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { deletarEventoCalendar, criarEventoMeet } from '@/lib/google-calendar'
import { enviarAulaContabilizadaComoDada, enviarConfirmacaoRemarcacao } from '@/lib/resend'
import { horasAteAula, formatDateTime } from '@/lib/utils'
import { startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function cancelarAula(aulaId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const serviceSupabase = await createServiceClient()

  const { data: aula, error: fetchError } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(aluno_id, aulas_dadas, aulas_restantes, profiles(full_name, email))')
    .eq('id', aulaId)
    .single()

  if (fetchError || !aula) throw new Error('Aula não encontrada')

  const contrato = aula.contratos as any
  
  // Segurança: Professor ou o dono da aula
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isProfessor = profile?.role === 'professor'
  if (!isProfessor && contrato.aluno_id !== user.id) {
    throw new Error('Sem permissão para cancelar esta aula')
  }

  const horas = horasAteAula(aula.data_hora)
  const avisoSuficiente = horas >= 2

  let novoStatus: string
  let aulasDadas = contrato.aulas_dadas
  let aulasRestantes = contrato.aulas_restantes

  if (avisoSuficiente) {
    novoStatus = 'cancelada'
    if (aula.google_event_id) {
      try { await deletarEventoCalendar(aula.google_event_id) } catch (e) {
        console.error('Error deleting calendar event:', e)
      }
    }
  } else {
    novoStatus = 'dada'
    aulasDadas++
    aulasRestantes--

    await enviarAulaContabilizadaComoDada({
      to: contrato.profiles.email,
      nomeAluno: contrato.profiles.full_name,
      dataHora: formatDateTime(aula.data_hora),
      aulasDadas,
      aulasRestantes,
    })
  }

  const { error: updateError } = await serviceSupabase
    .from('aulas')
    .update({
      status: novoStatus,
      aviso_horas_antecedencia: Math.max(0, horas),
    })
    .eq('id', aulaId)

  if (updateError) throw new Error('Erro ao atualizar status da aula')

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true, status: novoStatus, aulasDadas, aulasRestantes }
}

export async function remarcarAula(aulaId: number, novaDataHora: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const serviceSupabase = await createServiceClient()

  const { data: aula, error: fetchError } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(*, planos(*), profiles(*))')
    .eq('id', aulaId)
    .single()

  if (fetchError || !aula) throw new Error('Aula não encontrada')

  const contrato = aula.contratos as any
  const plano = contrato.planos
  const aluno = contrato.profiles

  const isProfessor = aluno.id !== user.id
  if (!isProfessor && contrato.aluno_id !== user.id) {
    throw new Error('Sem permissão')
  }

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
    throw new Error(`Limite de ${plano.remarca_max_mes} remarcação(ões)/mês atingido`)
  }

  let novoEventId = ''
  let novoMeetLink = ''

  try {
    const { eventId, meetLink } = await criarEventoMeet({
      titulo: `🇬🇧 Aula de Inglês — ${aluno.full_name} (REMARCADA)`,
      dataHora: new Date(novaDataHora),
      emailAluno: aluno.email,
      emailProfessor: process.env.RESEND_FROM_EMAIL!,
      descricao: `
📌 DETALHES DA AULA (REMARCADA)
👤 Aluno: ${aluno.full_name}
📚 Nível: ${aluno.nivel || 'N/A'}

🔗 [Ver no Sistema](${process.env.NEXT_PUBLIC_APP_URL}/professor/alunos/${contrato.aluno_id})

---
Instruções:
- Clique no link do Google Meet abaixo para entrar na aula.
      `.trim()
    })
    novoEventId = eventId
    novoMeetLink = meetLink

    if (aula.google_event_id) {
      await deletarEventoCalendar(aula.google_event_id)
    }
  } catch (e) {
    console.error('Google Calendar error:', e)
  }

  await serviceSupabase
    .from('aulas')
    .update({ status: 'remarcada' })
    .eq('id', aulaId)

  const { data: novaAula, error: insertError } = await serviceSupabase
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

  if (insertError) throw new Error('Erro ao criar nova aula')

  await serviceSupabase
    .from('remarcacoes_mes')
    .upsert({
      aluno_id: contrato.aluno_id,
      mes: mesStr,
      quantidade: qtdAtual + 1,
    }, { onConflict: 'aluno_id,mes' })

  await enviarConfirmacaoRemarcacao({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    dataAntiga: formatDateTime(aula.data_hora),
    dataNova: formatDateTime(novaDataHora),
    meetLink: novoMeetLink,
  })

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true, novaAula }
}

export async function solicitarRemarcacao(aulaId: number, novaDataHora: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const serviceSupabase = await createServiceClient()

  const { data: aula, error: fetchError } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(*, planos(*), profiles(*))')
    .eq('id', aulaId)
    .single()

  if (fetchError || !aula) throw new Error('Aula não encontrada')

  const contrato = aula.contratos as any
  const plano = contrato.planos

  if (contrato.aluno_id !== user.id) {
    throw new Error('Apenas o aluno pode solicitar remarcação')
  }

  // Verificar limite de remarcações
  const mes = startOfMonth(new Date(aula.data_hora))
  const mesStr = mes.toISOString().split('T')[0]

  const { data: remarcacao } = await serviceSupabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', contrato.aluno_id)
    .eq('mes', mesStr)
    .single()

  const qtdAtual = remarcacao?.quantidade || 0
  if (qtdAtual >= plano.remarca_max_mes) {
    throw new Error(`Limite de ${plano.remarca_max_mes} remarcação(ões)/mês atingido`)
  }

  // Atualizar para status pendente e salvar a data solicitada
  const { error: updateError } = await serviceSupabase
    .from('aulas')
    .update({ 
      status: 'pendente_remarcacao',
      data_hora_solicitada: novaDataHora 
    })
    .eq('id', aulaId)

  if (updateError) throw new Error('Erro ao solicitar remarcação')

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true }
}

export async function concluirAula(aulaId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const serviceSupabase = await createServiceClient()

  // Get aula and contract info
  const { data: aula, error: fetchError } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(*, profiles(*))')
    .eq('id', aulaId)
    .single()

  if (fetchError || !aula) throw new Error('Aula não encontrada')
  if (aula.status === 'dada') throw new Error('Aula já consta como concluída')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') throw new Error('Apenas o professor pode concluir aulas manualmente')

  const contrato = aula.contratos as any
  const aulasDadas = (contrato.aulas_dadas || 0) + 1
  const aulasRestantes = Math.max(0, (contrato.aulas_restantes || 0) - 1)

  // Update aula and contract
  const { error: updateAulaErr } = await serviceSupabase
    .from('aulas')
    .update({ status: 'dada' })
    .eq('id', aulaId)

  if (updateAulaErr) throw new Error('Erro ao atualizar aula')

  const { error: updateContratoErr } = await serviceSupabase
    .from('contratos')
    .update({ 
      aulas_dadas: aulasDadas,
      aulas_restantes: aulasRestantes 
    })
    .eq('id', contrato.id)

  if (updateContratoErr) throw new Error('Erro ao atualizar contrato')

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true, aulasDadas, aulasRestantes }
}

