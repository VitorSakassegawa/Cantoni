import { enviarAulaContabilizadaComoDada } from '../resend'
import { createServiceClient } from '../supabase/server'
import { formatDateTime } from '../utils'

type ContractServicePayment = {
  parcela_num?: number | null
  status?: string | null
}

type ContractServiceProfile = {
  email?: string | null
  full_name?: string | null
}

type ContractServicePlan = {
  freq_semana?: number | null
}

type ContractServiceContract = {
  id: number
  aulas_dadas?: number | null
  aulas_restantes?: number | null
  aulas_totais?: number | null
  status_financeiro?: string | null
  planos?: ContractServicePlan | null
  profiles?: ContractServiceProfile | null
}

type ContractServiceLesson = {
  id: number
  status?: string | null
  data_hora: string
  contratos?: ContractServiceContract | null
}

function hasOpenExpectedPayments(payments: ContractServicePayment[], currentCycle: number) {
  return payments.some((payment) => Number(payment.parcela_num || 0) <= currentCycle && payment.status !== 'pago')
}

export class ContractService {
  /**
   * Concludes a lesson, updating contract counts and checking financial state.
   */
  static async concluirAula(aulaId: number, _professorId: string) {
    void _professorId
    const supabase = await createServiceClient()

    const { data: aula, error: fetchError } = await supabase
      .from('aulas')
      .select('*, contratos(*, profiles(*), planos(*))')
      .eq('id', aulaId)
      .single()

    if (fetchError || !aula) throw new Error('Aula nao encontrada')
    if (aula.status === 'dada') return { alreadyConcluded: true }

    const contrato = aula.contratos as ContractServiceContract | null
    if (!contrato) {
      throw new Error('Contrato da aula nao encontrado')
    }

    const aulasDadas = (contrato.aulas_dadas || 0) + 1
    const aulasRestantes = Math.max(0, (contrato.aulas_restantes || 0) - 1)

    let statusFinanceiro = contrato.status_financeiro || 'em_dia'
    const freqSemana = contrato.planos?.freq_semana || 1
    const lessonsPerCycle = freqSemana * 4
    const isAdHoc = !contrato.planos?.freq_semana
    const totalLessons = contrato.aulas_totais || 0

    const thresholdReached = isAdHoc ? aulasDadas >= totalLessons : aulasDadas % lessonsPerCycle === 0

    if (thresholdReached) {
      const { data: payments } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('contrato_id', contrato.id)
        .order('parcela_num', { ascending: true })

      const currentCycle = isAdHoc ? 1 : Math.ceil(aulasDadas / lessonsPerCycle)
      if (hasOpenExpectedPayments(payments || [], currentCycle)) {
        statusFinanceiro = 'pendente'

        try {
          const { enviarAlertaPendenciaFinanceira } = await import('../resend')
          const studentEmail = contrato.profiles?.email
          if (studentEmail) {
            await enviarAlertaPendenciaFinanceira({
              to: studentEmail,
              nomeAluno: contrato.profiles?.full_name || 'Aluno',
              aulasConcluidas: aulasDadas,
              proximosPassos: `Aula #${aulasDadas} concluida (limite do ciclo). Pendencia financeira detectada.`,
            })
          }
        } catch (err) {
          console.error('ContractService: Alert email failed', err)
        }
      }
    }

    const { error: updateError } = await supabase.rpc('concluir_aula_v2', {
      p_aula_id: aulaId,
      p_contrato_id: contrato.id,
      p_aulas_dadas: aulasDadas,
      p_aulas_restantes: aulasRestantes,
      p_status_financeiro: statusFinanceiro,
    })

    if (updateError) {
      const { error: err1 } = await supabase.from('aulas').update({ status: 'dada' }).eq('id', aulaId)
      const { error: err2 } = await supabase
        .from('contratos')
        .update({
          aulas_dadas: aulasDadas,
          aulas_restantes: aulasRestantes,
          status_financeiro: statusFinanceiro,
        })
        .eq('id', contrato.id)

      if (err1 || err2) throw new Error('Erro ao atualizar banco de dados')
    }

    return { success: true, aulasDadas, aulasRestantes, statusFinanceiro }
  }

  static async cancelarAulaComPenalidade(
    aulaId: number,
    contrato: ContractServiceContract,
    aula: Pick<ContractServiceLesson, 'data_hora'>
  ) {
    const supabase = await createServiceClient()
    const aulasDadas = (contrato.aulas_dadas || 0) + 1
    const aulasRestantes = Math.max(0, (contrato.aulas_restantes || 0) - 1)

    await supabase
      .from('aulas')
      .update({
        status: 'dada',
        aviso_horas_antecedencia: 0,
      })
      .eq('id', aulaId)

    await supabase
      .from('contratos')
      .update({
        aulas_dadas: aulasDadas,
        aulas_restantes: aulasRestantes,
      })
      .eq('id', contrato.id)

    const studentEmail = contrato.profiles?.email
    if (studentEmail) {
      await enviarAulaContabilizadaComoDada({
        to: studentEmail,
        nomeAluno: contrato.profiles?.full_name || 'Aluno',
        dataHora: formatDateTime(aula.data_hora),
        aulasDadas,
        aulasRestantes,
      })
    }

    return { aulasDadas, aulasRestantes }
  }

  static async syncFinancialStatus(contratoId: string) {
    const supabase = await createServiceClient()

    const { data: contrato } = await supabase
      .from('contratos')
      .select('*, planos(*)')
      .eq('id', contratoId)
      .single()

    if (!contrato) return

    const aulasDadas = contrato.aulas_dadas || 0
    const freqSemana = contrato.planos?.freq_semana || 1
    const lessonsPerCycle = freqSemana * 4
    const currentCycle = !contrato.planos?.freq_semana ? 1 : Math.ceil(aulasDadas / lessonsPerCycle)

    const { data: payments } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('parcela_num', { ascending: true })

    const newStatus = hasOpenExpectedPayments(payments || [], currentCycle) ? 'pendente' : 'em_dia'

    if (newStatus !== contrato.status_financeiro) {
      await supabase.from('contratos').update({ status_financeiro: newStatus }).eq('id', contratoId)
    }
  }
}
