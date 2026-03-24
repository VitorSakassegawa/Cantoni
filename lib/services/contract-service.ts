import { createServiceClient } from '../supabase/server'
import { formatDateTime } from '../utils'
import { enviarAulaContabilizadaComoDada } from '../resend'

function hasOpenExpectedPayments(payments: any[], currentCycle: number) {
  return payments.some((payment: any) => payment.parcela_num <= currentCycle && payment.status !== 'pago')
}

export class ContractService {
  /**
   * Concludes a lesson, updating contract counts and checking financial state.
   */
  static async concluirAula(aulaId: number, professorId: string) {
    const supabase = await createServiceClient()

    // 1. Fetch current state
    const { data: aula, error: fetchError } = await supabase
      .from('aulas')
      .select('*, contratos(*, profiles(*), planos(*))')
      .eq('id', aulaId)
      .single()

    if (fetchError || !aula) throw new Error('Aula não encontrada')
    if (aula.status === 'dada') return { alreadyConcluded: true }

    const contrato = aula.contratos as any
    const aulasDadas = (contrato.aulas_dadas || 0) + 1
    const aulasRestantes = Math.max(0, (contrato.aulas_restantes || 0) - 1)

    // 2. Financial Logic
    let statusFinanceiro = contrato.status_financeiro || 'em_dia'
    const freqSemana = contrato.planos?.freq_semana || 1
    const lessonsPerCycle = freqSemana * 4
    const isAdHoc = !contrato.planos?.freq_semana
    
    const thresholdReached = isAdHoc 
      ? aulasDadas >= contrato.aulas_totais
      : aulasDadas % lessonsPerCycle === 0

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
          await enviarAlertaPendenciaFinanceira({
            to: contrato.profiles.email,
            nomeAluno: contrato.profiles.full_name,
            aulasConcluidas: aulasDadas,
            proximosPassos: `Aula #${aulasDadas} concluída (limite do ciclo). Pendência financeira detectada.`
          })
        } catch (err) {
          console.error('ContractService: Alert email failed', err)
        }
      }
    }

    // 3. Atomic Update
    const { error: updateError } = await supabase.rpc('concluir_aula_v2', {
      p_aula_id: aulaId,
      p_contrato_id: contrato.id,
      p_aulas_dadas: aulasDadas,
      p_aulas_restantes: aulasRestantes,
      p_status_financeiro: statusFinanceiro
    })

    if (updateError) {
      // Fallback if RPC doesn't exist yet (better to use RPC for atomicity)
      const { error: err1 } = await supabase.from('aulas').update({ status: 'dada' }).eq('id', aulaId)
      const { error: err2 } = await supabase.from('contratos').update({ 
        aulas_dadas: aulasDadas, 
        aulas_restantes: aulasRestantes,
        status_financeiro: statusFinanceiro
      }).eq('id', contrato.id)
      
      if (err1 || err2) throw new Error('Erro ao atualizar banco de dados')
    }

    return { success: true, aulasDadas, aulasRestantes, statusFinanceiro }
  }

  static async cancelarAulaComPenalidade(aulaId: number, contrato: any, aula: any) {
    const supabase = await createServiceClient()
    const aulasDadas = (contrato.aulas_dadas || 0) + 1
    const aulasRestantes = Math.max(0, (contrato.aulas_restantes || 0) - 1)

    await supabase.from('aulas').update({ 
      status: 'dada',
      aviso_horas_antecedencia: 0 
    }).eq('id', aulaId)

    await supabase.from('contratos').update({
      aulas_dadas: aulasDadas,
      aulas_restantes: aulasRestantes
    }).eq('id', contrato.id)

    await enviarAulaContabilizadaComoDada({
      to: contrato.profiles.email,
      nomeAluno: contrato.profiles.full_name,
      dataHora: formatDateTime(aula.data_hora),
      aulasDadas,
      aulasRestantes,
    })

    return { aulasDadas, aulasRestantes }
  }

  static async syncFinancialStatus(contratoId: string) {
    const supabase = await createServiceClient()
    
    // Check if there are any pending payments that should have been paid
    // For simplicity, if the LATEST expected payment for the current lessons is paid, it's em_dia
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
      await supabase
        .from('contratos')
        .update({ status_financeiro: newStatus })
        .eq('id', contratoId)
    }
  }
}
