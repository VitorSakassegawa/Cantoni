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
  // Se for uma aula que já estava pendente (recesso ou aguardando decisão), não conta como nova remarcação do aluno
  const isResolvingConflict = aula.status === 'pendente_remarcacao' || aula.status === 'pendente_remarcacao_rejeitada'

  if (!isProfessor && !isResolvingConflict && qtdAtual >= plano.remarca_max_mes) {
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

  if (!isResolvingConflict) {
    await serviceSupabase
      .from('remarcacoes_mes')
      .upsert({
        aluno_id: contrato.aluno_id,
        mes: mesStr,
        quantidade: qtdAtual + 1,
      }, { onConflict: 'aluno_id,mes' })
  }

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
  const isResolvingConflict = aula.status === 'pendente_remarcacao' || aula.status === 'pendente_remarcacao_rejeitada'

  if (!isResolvingConflict && qtdAtual >= plano.remarca_max_mes) {
    throw new Error(`Limite de ${plano.remarca_max_mes} remarcação(ões)/mês atingido`)
  }

  console.log('[solicitarRemarcacao] Início:', { aulaId, novaDataHora })
  
  const isoData = new Date(novaDataHora).toISOString()
  console.log('[solicitarRemarcacao] ISO gerado:', isoData)

  const { data: verify, error: updateError } = await serviceSupabase
    .from('aulas')
    .update({ 
      status: 'pendente_remarcacao',
      data_hora_solicitada: isoData 
    })
    .eq('id', aulaId)
    .select()
    .single()

  if (updateError) {
    console.error('[solicitarRemarcacao] Erro no update:', updateError)
    throw new Error(`Erro ao solicitar remarcação: ${updateError.message}`)
  }

  console.log('[solicitarRemarcacao] Sucesso! Verificação:', { 
    id: verify.id, 
    status: verify.status, 
    solicitada: verify.data_hora_solicitada 
  })

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

  // Financial Dependency check
  let statusFinanceiro = contrato.status_financeiro || 'em_dia'
  const freqSemana = contrato.planos?.freq_semana || 1
  const lessonsPerCycle = freqSemana * 4 // 4 or 8

  // Ad Hoc vs Weekly check
  const isAdHoc = !contrato.planos?.freq_semana 
  const thresholdReached = isAdHoc 
    ? aulasDadas >= contrato.aulas_totais
    : aulasDadas % lessonsPerCycle === 0

  if (thresholdReached) {
    // Check payments
    const { data: payments } = await serviceSupabase
      .from('pagamentos')
      .select('*')
      .eq('contrato_id', contrato.id)
      .order('parcela_num', { ascending: true })

    const currentCycle = isAdHoc ? 1 : Math.ceil(aulasDadas / lessonsPerCycle)
    const currentPayment = payments?.find((p: any) => p.parcela_num === currentCycle)

    if (!currentPayment || currentPayment.status !== 'pago') {
      statusFinanceiro = 'pendente'
      
      // Notify Student
      try {
        const { enviarAlertaPendenciaFinanceira } = await import('@/lib/resend')
        await enviarAlertaPendenciaFinanceira({
          to: contrato.profiles.email,
          nomeAluno: contrato.profiles.full_name,
          aulasConcluidas: aulasDadas,
          proximosPassos: `Identificamos que a aula de número ${aulasDadas} foi concluída, atingindo o limite do seu ciclo atual. Para continuar com as próximas aulas sem interrupção, por favor realize o pagamento da parcela correspondente no painel financeiro.`
        })
      } catch (err) {
        console.error('Error sending financial alert email:', err)
      }
    }
  }

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
      aulas_restantes: aulasRestantes,
      status_financeiro: statusFinanceiro
    })
    .eq('id', contrato.id)

  if (updateContratoErr) throw new Error('Erro ao atualizar contrato')

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true, aulasDadas, aulasRestantes, statusFinanceiro }
}


export async function rejeitarRemarcacao(aulaId: number, justificativa: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') throw new Error('Apenas o professor pode rejeitar remarcações')

  const serviceSupabase = await createServiceClient()

  // Get aula to find aluno_id for revalidation
  const { data: aula } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(aluno_id)')
    .eq('id', aulaId)
    .single()

  if (!aula) throw new Error('Aula não encontrada')

  const { error } = await serviceSupabase
    .from('aulas')
    .update({
      status: 'pendente_remarcacao_rejeitada',
      justificativa_professor: justificativa,
      data_hora_solicitada: null
    })
    .eq('id', aulaId)

  if (error) throw new Error('Erro ao rejeitar remarcação')

  revalidatePath('/professor')
  if (aula.contratos?.aluno_id) {
    revalidatePath(`/professor/alunos/${aula.contratos.aluno_id}`)
  }
  revalidatePath('/aluno')

  return { success: true }
}
