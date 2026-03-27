import { NextRequest, NextResponse } from 'next/server'
import { fromZonedTime } from 'date-fns-tz'
import { requireProfessor } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildLessonInviteDescription,
  buildLessonInviteTitle,
  criarEventoMeet,
  deletarEventoCalendar,
} from '@/lib/google-calendar'
import { enviarEmailBoasVindas } from '@/lib/resend'
import { mapWithConcurrency } from '@/lib/async'
import { findContractEndDateForLessons, gerarGradeAulas, formatDateTime } from '@/lib/utils'
import { calculateContractSpecs } from '@/lib/utils/contract-logic'
import { logActivityBestEffort } from '@/lib/activity-log'
import {
  calculateCreditApplicationPlan,
  getAppliedCreditTotal,
  listAvailableContractCredits,
} from '@/lib/contract-credits'

const CALENDAR_CONCURRENCY = 4

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function cleanupContractArtifacts(
  serviceSupabase: Awaited<ReturnType<typeof createServiceClient>>,
  contractId: number,
  eventIds: string[]
) {
  await Promise.allSettled(
    eventIds.map((eventId) => deletarEventoCalendar(eventId))
  )
  await serviceSupabase.from('contratos').delete().eq('id', contractId)
}

function normalizeLessonTotal(rawValue: unknown, fallback: number) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

export async function POST(request: NextRequest) {
  try {
    const { user: professor } = await requireProfessor()

    const {
      alunoId,
      planoId,
      dataInicio,
      dataFim,
      semestre,
      ano,
      diasDaSemana,
      horario,
      valor,
      livro_atual,
      nivel_atual,
      dia_vencimento,
      forma_pagamento,
      tipoContrato,
        descontoValor,
        descontoPercentual,
        aulasTotais,
        numParcelas,
        creditToApply,
      } = await request.json()

    const serviceSupabase = await createServiceClient()
    const { data: plano } = await serviceSupabase.from('planos').select('*').eq('id', planoId).single()
    const { data: aluno } = await serviceSupabase.from('profiles').select('*').eq('id', alunoId).single()

    if (!plano || !aluno) {
      return NextResponse.json({ error: 'Plano ou aluno não encontrado' }, { status: 404 })
    }

    const startObj = new Date(`${dataInicio}T12:00:00`)
    const requestedEndObj = dataFim ? new Date(`${dataFim}T12:00:00`) : undefined
    const contractValue = Number(valor || 0)
    const requestedCreditToApply = Number(creditToApply || 0)

    if (!Number.isFinite(contractValue) || contractValue < 0) {
      return NextResponse.json({ error: 'Valor do contrato inválido' }, { status: 400 })
    }

    if (!Number.isFinite(requestedCreditToApply) || requestedCreditToApply < 0) {
      return NextResponse.json({ error: 'Crédito aplicado inválido' }, { status: 400 })
    }

    const specs = calculateContractSpecs(startObj, planoId, diasDaSemana, tipoContrato, requestedEndObj)
    const totalLessons = normalizeLessonTotal(aulasTotais, specs.totalLessons)
    const availableCreditSources = await listAvailableContractCredits(serviceSupabase, alunoId)
    const totalAvailableCredit = Number(
      availableCreditSources.reduce((total, source) => total + source.availableValue, 0).toFixed(2)
    )

    if (requestedCreditToApply - totalAvailableCredit > 0.009) {
      return NextResponse.json(
        {
          error: `O crédito disponível foi atualizado e agora totaliza R$ ${totalAvailableCredit.toFixed(2)}.`,
        },
        { status: 409 }
      )
    }

    const creditApplications = calculateCreditApplicationPlan({
      requestedAmount: Math.min(contractValue, requestedCreditToApply),
      sources: availableCreditSources,
    })
    const appliedCreditTotal = getAppliedCreditTotal(creditApplications)
    const netContractValue = Number(Math.max(0, contractValue - appliedCreditTotal).toFixed(2))

    const { data: recessosDb } = await serviceSupabase
      .from('recessos')
      .select('data_inicio, data_fim')

    const customHolidays: string[] = []
    for (const recesso of recessosDb || []) {
      const start = new Date(`${recesso.data_inicio}T12:00:00`)
      const end = new Date(`${recesso.data_fim}T12:00:00`)
      const current = new Date(start)
      while (current <= end) {
        customHolidays.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
    }

    const generatedEndObj =
      totalLessons > 0
        ? findContractEndDateForLessons(startObj, diasDaSemana, totalLessons, customHolidays)
        : requestedEndObj || specs.endDate
    const effectiveEndObj =
      requestedEndObj && requestedEndObj > generatedEndObj ? requestedEndObj : generatedEndObj
    const effectiveEndDate = effectiveEndObj.toISOString().split('T')[0]
    const datasAulas = gerarGradeAulas(startObj, effectiveEndObj, diasDaSemana, totalLessons, customHolidays)

    const { data: contrato, error: contratoErr } = await serviceSupabase
      .from('contratos')
      .insert({
        aluno_id: alunoId,
        plano_id: planoId,
        data_inicio: dataInicio,
        data_fim: effectiveEndDate,
        semestre,
        ano,
        aulas_totais: totalLessons,
        aulas_restantes: totalLessons,
        livro_atual,
        nivel_atual,
        horario,
        valor: netContractValue,
        dia_vencimento,
        forma_pagamento,
        tipo_contrato: tipoContrato || 'semestral',
        desconto_valor: descontoValor || 0,
        desconto_percentual: descontoPercentual || 0,
        dias_da_semana: diasDaSemana,
      })
      .select()
      .single()

    if (contratoErr || !contrato) {
      console.error('Contrato insert error:', contratoErr)
      return NextResponse.json(
        { error: 'Erro ao criar contrato no banco de dados' },
        { status: 500 }
      )
    }

    const createdEventIds: string[] = []

    try {
      const lessonDrafts = await mapWithConcurrency(datasAulas, CALENDAR_CONCURRENCY, async (dateOnly, index) => {
        const dateStr = dateOnly.toISOString().split('T')[0]
        const cleanHorario = (horario || '12:00').replace('h', ':').trim()
        const dataObj = fromZonedTime(`${dateStr} ${cleanHorario}`, 'America/Sao_Paulo')

        if (Number.isNaN(dataObj.getTime())) {
          return null
        }

        const isBonus = index >= specs.regularLessons
        let eventId = ''
        let meetLink = ''
        const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/professor/alunos/${alunoId}`

        try {
          const result = await criarEventoMeet({
            titulo: buildLessonInviteTitle({
              studentName: aluno.full_name,
              isBonus,
            }),
            dataHora: dataObj,
            emailAluno: aluno.email,
            emailProfessor: process.env.RESEND_FROM_EMAIL!,
            descricao: buildLessonInviteDescription({
              studentName: aluno.full_name,
              level: nivel_atual,
              book: livro_atual,
              portalUrl,
              isBonus,
            }),
          })

          if (result.success) {
            eventId = result.eventId
            meetLink = result.meetLink
            createdEventIds.push(eventId)
          }
        } catch (error) {
          console.error('Google Calendar error', error)
        }

        return {
          dataObj,
          isBonus,
          eventId,
          meetLink,
        }
      })

      const calendarFailures = lessonDrafts.filter((draft) => draft && !draft.eventId).length

      const aulasParaInserir = lessonDrafts
        .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft))
        .map((draft) => ({
          contrato_id: contrato.id,
          google_event_id: draft.eventId || null,
          data_hora: draft.dataObj.toISOString(),
          duracao_minutos: 45,
          status: 'agendada',
          meet_link: draft.meetLink,
          is_bonus: draft.isBonus,
        }))

      const primeirasCinco = lessonDrafts
        .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft))
        .slice(0, 5)
        .map((draft) => ({
          data: formatDateTime(draft.dataObj),
          link: draft.meetLink,
        }))

      const { error: insertAulasErr } = await serviceSupabase.from('aulas').insert(aulasParaInserir)
      if (insertAulasErr) {
        throw insertAulasErr
      }

      const nParcelas = numParcelas || (tipoContrato === 'ad-hoc' ? 1 : specs.remainingMonths)
      const valorParcela = Number((netContractValue / nParcelas).toFixed(2))
      const pagamentosParaInserir = []

      for (let i = 1; i <= nParcelas; i += 1) {
        const mesVenc = new Date(`${dataInicio}T12:00:00`)
        mesVenc.setMonth(mesVenc.getMonth() + i)

        const ultimoDiaMes = new Date(mesVenc.getFullYear(), mesVenc.getMonth() + 1, 0).getDate()
        const diaEfetivo = Math.min(dia_vencimento || 5, ultimoDiaMes)
        const vencimento = new Date(mesVenc.getFullYear(), mesVenc.getMonth(), diaEfetivo, 12, 0, 0)

        pagamentosParaInserir.push({
          contrato_id: contrato.id,
          parcela_num: i,
          valor: valorParcela,
          data_vencimento: vencimento.toISOString().split('T')[0],
          status: 'pendente',
          forma: forma_pagamento || 'pix',
        })
      }

      const { error: insertPagamentosErr } = await serviceSupabase
        .from('pagamentos')
        .insert(pagamentosParaInserir)

      if (insertPagamentosErr) {
        throw insertPagamentosErr
      }

      if (creditApplications.length > 0) {
        const { error: creditApplicationError } = await serviceSupabase
          .from('contract_credit_applications')
          .insert(
            creditApplications.map((application) => ({
              source_cancellation_id: application.cancellationId,
              source_contract_id: application.sourceContractId,
              target_contract_id: contrato.id,
              student_id: alunoId,
              applied_amount: application.amount,
              applied_by: professor.id,
            }))
          )

        if (creditApplicationError) {
          throw creditApplicationError
        }
      }

      let setupPasswordLink: string | undefined
      let emailWarning: string | null = null
      let calendarWarning: string | null = null
      try {
        const { data: linkData } = await serviceSupabase.auth.admin.generateLink({
          type: 'recovery',
          email: aluno.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
          },
        })
        setupPasswordLink = linkData?.properties?.action_link
      } catch (error) {
        console.error('Generate link error:', error)
        emailWarning = 'Contrato criado, mas não foi possível gerar o link de primeiro acesso.'
      }

      try {
        const emailResult = (await enviarEmailBoasVindas({
          to: aluno.email,
          nomeAluno: aluno.full_name,
          plano: plano.descricao || '',
          dataInicio: new Date(dataInicio).toLocaleDateString('pt-BR'),
          dataFim: new Date(effectiveEndDate).toLocaleDateString('pt-BR'),
          aulas: primeirasCinco,
          setupPasswordLink,
        })) as { error?: { message?: string } | null } | null

        if (emailResult?.error) {
          console.error('Welcome email delivery error:', emailResult.error)
          emailWarning = emailResult.error.message || 'Contrato criado, mas o e-mail de boas-vindas não pôde ser entregue.'
        }
      } catch (error) {
        console.error('Welcome email error:', error)
        emailWarning = 'Contrato criado, mas houve falha ao enviar o e-mail de boas-vindas.'
      }

      if (calendarFailures > 0) {
        calendarWarning =
          calendarFailures === datasAulas.length
            ? 'Contrato criado, mas não foi possível sincronizar as aulas com o Google Calendar/Meet.'
            : `Contrato criado, mas ${calendarFailures} aula(s) não puderam ser sincronizadas com o Google Calendar/Meet.`
      }

      await logActivityBestEffort({
        actorUserId: professor.id,
        targetUserId: alunoId,
        contractId: contrato.id,
        eventType: 'contract.created',
        title: 'Novo contrato criado',
        description: `Contrato ${semestre} ${ano} criado para ${aluno.full_name} com ${totalLessons} aula(s).`,
        severity: 'success',
        metadata: {
          planoId,
          tipoContrato: tipoContrato || 'semestral',
          totalLessons,
          value: netContractValue,
          grossValue: contractValue,
          appliedCreditTotal,
        },
      })

      return NextResponse.json({ success: true, contrato, emailWarning, calendarWarning })
    } catch (error: unknown) {
      console.error('Contract creation flow failed:', error)
      await cleanupContractArtifacts(serviceSupabase, contrato.id, createdEventIds)
      return NextResponse.json(
        { error: getErrorMessage(error, 'Erro ao finalizar criação do contrato') },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Contract authorization error:', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Erro interno') }, { status: 500 })
  }
}
