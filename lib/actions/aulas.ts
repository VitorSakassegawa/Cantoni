'use server'

import { startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { requireLessonAccess, requireProfessor } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { ContractService } from '@/lib/services/contract-service'
import { deletarEventoCalendar, criarEventoMeet } from '@/lib/google-calendar'
import { enviarConfirmacaoRemarcacao } from '@/lib/resend'
import { horasAteAula, formatDateTime } from '@/lib/utils'
import { logActivityBestEffort } from '@/lib/activity-log'
import { registerStudentActivityBestEffort } from '@/lib/streak'
import { getXpReward } from '@/lib/gamification'

export async function cancelarAula(aulaId: number) {
  const { user, aula, contrato, isProfessor, serviceSupabase } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: true,
  })

  const horas = horasAteAula(aula.data_hora)
  const avisoSuficiente = horas >= 2

  let novoStatus: string
  let aulasDadas = contrato.aulas_dadas
  let aulasRestantes = contrato.aulas_restantes

  if (avisoSuficiente) {
    novoStatus = 'cancelada'
    if (aula.google_event_id) {
      const res = await deletarEventoCalendar(aula.google_event_id)
      if (!res.success) {
        console.warn('cancelarAula: Google Calendar sync failed, but proceeding with DB update.')
      }
    }
  } else {
    const result = await ContractService.cancelarAulaComPenalidade(aulaId, contrato, aula)
    novoStatus = 'dada'
    aulasDadas = result.aulasDadas
    aulasRestantes = result.aulasRestantes
  }

  const { error: updateError } = await serviceSupabase
    .from('aulas')
    .update({
      status: novoStatus,
      aviso_horas_antecedencia: Math.max(0, horas),
    })
    .eq('id', aulaId)

  if (updateError) {
    throw new Error('Erro ao atualizar status da aula')
  }

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: contrato.aluno_id,
    contractId: contrato.id,
    lessonId: aulaId,
    eventType: 'lesson.cancelled',
    title: novoStatus === 'cancelada' ? 'Aula cancelada' : 'Aula encerrada com penalidade',
    description: isProfessor
      ? `O professor cancelou a aula marcada para ${formatDateTime(aula.data_hora)}.`
      : `O aluno cancelou a aula marcada para ${formatDateTime(aula.data_hora)}.`,
    severity: novoStatus === 'cancelada' ? 'info' : 'warning',
  })

  return { success: true, status: novoStatus, aulasDadas, aulasRestantes }
}

export async function remarcarAula(aulaId: number, novaDataHora: string) {
  const { user, aula, contrato, isProfessor, serviceSupabase } = await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: true,
  })

  const plano = contrato.planos
  const aluno = contrato.profiles
  const mes = startOfMonth(new Date(aula.data_hora))
  const mesStr = mes.toISOString().split('T')[0]

  const { data: remarcacao } = await serviceSupabase
    .from('remarcacoes_mes')
    .select('*')
    .eq('aluno_id', contrato.aluno_id)
    .eq('mes', mesStr)
    .single()

  const qtdAtual = remarcacao?.quantidade || 0
  const isResolvingConflict =
    aula.status === 'pendente_remarcacao' || aula.status === 'pendente_remarcacao_rejeitada'

  if (!isProfessor && !isResolvingConflict && qtdAtual >= plano.remarca_max_mes) {
    throw new Error(`Você já usou o limite de ${plano.remarca_max_mes} remarcação(ões) deste mês.`)
  }

  let novoEventId = ''
  let novoMeetLink = ''

  try {
    const resMeet = await criarEventoMeet({
      titulo: `Aula de Ingles - ${aluno.full_name} (REMARCADA)`,
      dataHora: new Date(novaDataHora),
      emailAluno: aluno.email,
      emailProfessor: process.env.RESEND_FROM_EMAIL!,
      descricao: `
DETALHES DA AULA (REMARCADA)
Aluno: ${aluno.full_name}
Nivel: ${aluno.nivel || 'N/A'}

[Ver no Sistema](${process.env.NEXT_PUBLIC_APP_URL}/professor/alunos/${contrato.aluno_id})

---
Instrucoes:
- Clique no link do Google Meet abaixo para entrar na aula.
      `.trim(),
    })

    if (resMeet.success) {
      novoEventId = resMeet.eventId
      novoMeetLink = resMeet.meetLink

      if (aula.google_event_id) {
        await deletarEventoCalendar(aula.google_event_id)
      }
    } else {
      console.warn('remarcarAula: Google Meet creation failed. Proceeding without link.')
    }
  } catch (error) {
    console.error('Google Calendar error:', error)
  }

  await serviceSupabase.from('aulas').update({ status: 'remarcada' }).eq('id', aulaId)

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
      motivo_remarcacao: aula.motivo_remarcacao
        ? `${aula.motivo_remarcacao} (Original: ${formatDateTime(aula.data_hora)})`
        : `Solicitado pelo aluno (Original: ${formatDateTime(aula.data_hora)})`,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error('Erro ao criar nova aula')
  }

  if (!isResolvingConflict) {
    await serviceSupabase.from('remarcacoes_mes').upsert(
      {
        aluno_id: contrato.aluno_id,
        mes: mesStr,
        quantidade: qtdAtual + 1,
      },
      { onConflict: 'aluno_id,mes' }
    )
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

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: contrato.aluno_id,
    contractId: contrato.id,
    lessonId: novaAula.id,
    eventType: 'lesson.rescheduled',
    title: 'Aula remarcada com sucesso',
    description: `A aula de ${formatDateTime(aula.data_hora)} foi remarcada para ${formatDateTime(novaDataHora)}.`,
    severity: 'success',
    metadata: {
      originalLessonId: aulaId,
      originalDateTime: aula.data_hora,
      newDateTime: novaDataHora,
      requestedBy: isProfessor ? 'professor' : 'student',
    },
  })

  return { success: true, novaAula }
}

export async function solicitarRemarcacao(aulaId: number, novaDataHora: string) {
  const { user, aula, contrato, serviceSupabase } = await requireLessonAccess(aulaId, {
    allowProfessor: false,
    allowStudentOwner: true,
  })

  const plano = contrato.planos

  if (contrato.aluno_id !== user.id) {
    throw new Error('Apenas o aluno pode solicitar remarcação')
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
  const isResolvingConflict =
    aula.status === 'pendente_remarcacao' || aula.status === 'pendente_remarcacao_rejeitada'

  if (!isResolvingConflict && qtdAtual >= plano.remarca_max_mes) {
    throw new Error(`Você já usou o limite de ${plano.remarca_max_mes} remarcação(ões) deste mês.`)
  }

  const isoData = new Date(novaDataHora).toISOString()

  const { error: updateError } = await serviceSupabase
    .from('aulas')
    .update({
      status: 'pendente_remarcacao',
      data_hora_solicitada: isoData,
    })
    .eq('id', aulaId)
    .select()
    .single()

  if (updateError) {
    console.error('[solicitarRemarcacao] Erro no update:', updateError)
    throw new Error(`Erro ao solicitar remarcação: ${updateError.message}`)
  }

  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: contrato.aluno_id,
    contractId: contrato.id,
    lessonId: aulaId,
    eventType: 'lesson.reschedule_requested',
    title: 'Solicitação de remarcação enviada',
    description: `O aluno solicitou trocar ${formatDateTime(aula.data_hora)} por ${formatDateTime(isoData)}.`,
    severity: 'warning',
  })

  return { success: true }
}

export async function concluirAula(aulaId: number) {
  await requireProfessor()
  const result = await ContractService.concluirAula(aulaId, '')

  if (result.alreadyConcluded) {
    return { success: true, xpAwarded: getXpReward('lessonComplete') }
  }

  const contrato = (
    await (await createServiceClient())
      .from('aulas')
      .select('contrato_id, contratos(aluno_id)')
      .eq('id', aulaId)
      .single()
  ).data as any

  revalidatePath('/professor')
  if (contrato?.aluno_id) {
    revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  }
  revalidatePath('/aluno')

  await logActivityBestEffort({
    targetUserId: contrato?.contratos?.aluno_id,
    contractId: contrato?.contrato_id,
    lessonId: aulaId,
    eventType: 'lesson.completed',
    title: 'Aula concluída',
    description: 'A aula foi marcada como dada e o progresso do contrato foi atualizado.',
    severity: 'success',
  })

  if (contrato?.contratos?.aluno_id) {
    await registerStudentActivityBestEffort(contrato.contratos.aluno_id)
  }

  return { success: true, xpAwarded: getXpReward('lessonComplete'), ...result }
}

export async function rejeitarRemarcacao(aulaId: number, justificativa: string) {
  const { user } = await requireProfessor()
  const serviceSupabase = await createServiceClient()

  const { data: aula } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(aluno_id)')
    .eq('id', aulaId)
    .single()

  if (!aula) {
    throw new Error('Aula não encontrada')
  }

  const { error } = await serviceSupabase
    .from('aulas')
    .update({
      status: 'pendente_remarcacao_rejeitada',
      justificativa_professor: justificativa,
      data_hora_solicitada: null,
    })
    .eq('id', aulaId)

  if (error) {
    throw new Error('Erro ao rejeitar remarcação')
  }

  revalidatePath('/professor')
  if (aula.contratos?.aluno_id) {
    revalidatePath(`/professor/alunos/${aula.contratos.aluno_id}`)
  }
  revalidatePath('/aluno')

  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: aula.contratos?.aluno_id,
    contractId: aula.contrato_id,
    lessonId: aulaId,
    eventType: 'lesson.reschedule_rejected',
    title: 'Solicitação de remarcação rejeitada',
    description: justificativa
      ? `A remarcação foi rejeitada com a justificativa: ${justificativa}`
      : 'A solicitação de remarcação foi rejeitada pelo professor.',
    severity: 'warning',
  })

  return { success: true }
}
