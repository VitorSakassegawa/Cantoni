import { NextRequest, NextResponse } from 'next/server'
import { fromZonedTime } from 'date-fns-tz'
import { requireProfessor } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { criarEventoMeet, deletarEventoCalendar } from '@/lib/google-calendar'
import { enviarEmailBoasVindas } from '@/lib/resend'
import { mapWithConcurrency } from '@/lib/async'
import { gerarGradeAulas, formatDateTime } from '@/lib/utils'
import { calculateContractSpecs } from '@/lib/utils/contract-logic'
import { logActivityBestEffort } from '@/lib/activity-log'

const CALENDAR_CONCURRENCY = 4

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
    } = await request.json()

    const serviceSupabase = await createServiceClient()
    const { data: plano } = await serviceSupabase.from('planos').select('*').eq('id', planoId).single()
    const { data: aluno } = await serviceSupabase.from('profiles').select('*').eq('id', alunoId).single()

    if (!plano || !aluno) {
      return NextResponse.json({ error: 'Plano ou aluno não encontrado' }, { status: 404 })
    }

    const startObj = new Date(`${dataInicio}T12:00:00`)
    const endObj = dataFim ? new Date(`${dataFim}T12:00:00`) : undefined
    const specs = calculateContractSpecs(startObj, planoId, diasDaSemana, tipoContrato, endObj)
    const totalLessons = normalizeLessonTotal(aulasTotais, specs.totalLessons)

    const { data: contrato, error: contratoErr } = await serviceSupabase
      .from('contratos')
      .insert({
        aluno_id: alunoId,
        plano_id: planoId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        semestre,
        ano,
        aulas_totais: totalLessons,
        aulas_restantes: totalLessons,
        livro_atual,
        nivel_atual,
        horario,
        valor,
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
      const { data: recessosDb } = await serviceSupabase
        .from('recessos')
        .select('data_inicio, data_fim')

      const customHolidays: string[] = []
      for (const recesso of recessosDb || []) {
        const start = new Date(`${recesso.data_inicio}T12:00:00`)
        const end = new Date(`${recesso.data_fim}T12:00:00`)
        let current = new Date(start)
        while (current <= end) {
          customHolidays.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
      }

      const inicio = new Date(`${dataInicio}T12:00:00`)
      const fim = new Date(`${dataFim}T23:59:59`)
      const datasAulas = gerarGradeAulas(inicio, fim, diasDaSemana, totalLessons, customHolidays)

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

        try {
          const result = await criarEventoMeet({
            titulo: `Aula de Ingles - ${aluno.full_name}${isBonus ? ' (BONUS)' : ''}`,
            dataHora: dataObj,
            emailAluno: aluno.email,
            emailProfessor: process.env.RESEND_FROM_EMAIL!,
            descricao: `
DETALHES DA AULA ${isBonus ? '(BONUS)' : ''}
Aluno: ${aluno.full_name}
Nivel: ${nivel_atual || 'N/A'}
Livro: ${livro_atual || 'N/A'}

[Ver no Sistema](${process.env.NEXT_PUBLIC_APP_URL}/professor/alunos/${alunoId})
---
Instrucoes:
- Clique no link do Google Meet abaixo para entrar na aula.
- Caso precise remarcar, com 2h de antecedencia.
            `.trim(),
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
      const valorParcela = Number((Number(valor) / nParcelas).toFixed(2))
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

      let setupPasswordLink: string | undefined
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
      }

      void enviarEmailBoasVindas({
        to: aluno.email,
        nomeAluno: aluno.full_name,
        plano: plano.descricao || '',
        dataInicio: new Date(dataInicio).toLocaleDateString('pt-BR'),
        dataFim: new Date(dataFim).toLocaleDateString('pt-BR'),
        aulas: primeirasCinco,
        setupPasswordLink,
      })
        .then((result: any) => {
          if (result?.error) {
            console.error('Welcome email delivery error:', result.error)
          }
        })
        .catch((error) => {
          console.error('Welcome email error:', error)
        })

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
          value: valor,
        },
      })

      return NextResponse.json({ success: true, contrato })
    } catch (error: any) {
      console.error('Contract creation flow failed:', error)
      await cleanupContractArtifacts(serviceSupabase, contrato.id, createdEventIds)
      return NextResponse.json(
        { error: error.message || 'Erro ao finalizar criação do contrato' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Contract authorization error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
