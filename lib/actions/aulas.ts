import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProfessor } from '@/lib/auth'
import { ContractService } from '@/lib/services/contract-service'
import { deletarEventoCalendar, criarEventoMeet } from '@/lib/google-calendar'
import { enviarConfirmacaoRemarcacao } from '@/lib/resend'
import { horasAteAula, formatDateTime } from '@/lib/utils'
import { startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function cancelarAula(aulaId: number) {
  const user = await requireAuth()
  const serviceSupabase = await createServiceClient()

  const { data: aula, error: fetchError } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(aluno_id, aulas_dadas, aulas_restantes, profiles(full_name, email))')
    .eq('id', aulaId)
    .single()

  if (fetchError || !aula) throw new Error('Aula não encontrada')

  const contrato = aula.contratos as any
  
  // Use shared profile check if needed, or rely on RLS if possible (but we're in service mode)
  const isProfessor = (await createClient()).from('profiles').select('role').eq('id', user.id).single().then((r: any) => r.data?.role === 'professor')
  
  if (!(await isProfessor) && contrato.aluno_id !== user.id) {
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
    const resMeet = await criarEventoMeet({
      titulo: `🇺🇸 Aula de Inglês — ${aluno.full_name} (REMARCADA)`,
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
    
    if (resMeet.success) {
      novoEventId = resMeet.eventId
      novoMeetLink = resMeet.meetLink

      if (aula.google_event_id) {
        await deletarEventoCalendar(aula.google_event_id)
      }
    } else {
      console.warn('remarcarAula: Google Meet creation failed. Proceeding without link.')
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
      motivo_remarcacao: aula.motivo_remarcacao 
        ? `${aula.motivo_remarcacao} (Original: ${formatDateTime(aula.data_hora)})`
        : `Solicitado pelo aluno (Original: ${formatDateTime(aula.data_hora)})`
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

  const isoData = new Date(novaDataHora).toISOString()

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



  revalidatePath('/professor')
  revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true }
}

export async function concluirAula(aulaId: number) {
  await requireProfessor()
  const result = await ContractService.concluirAula(aulaId, '')
  
  if (result.alreadyConcluded) return { success: true }

  const contrato = (await (await createServiceClient()).from('aulas').select('contratos(aluno_id)').eq('id', aulaId).single()).data?.contratos as any

  revalidatePath('/professor')
  if (contrato?.aluno_id) revalidatePath(`/professor/alunos/${contrato.aluno_id}`)
  revalidatePath('/aluno')

  return { success: true, ...result }
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
