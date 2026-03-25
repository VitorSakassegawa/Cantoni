type PendingPaymentInput = {
  id: number
  parcela_num: number | string | null
}

export type PendingPaymentUpdate = {
  id: number
  valor: number
  forma: string
  data_vencimento: string
}

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0]
}

export function buildPendingPaymentUpdates(input: {
  dataInicio: string
  diaVencimento: number
  formaPagamento: string
  unpaidPayments: PendingPaymentInput[]
  remainingAmount: number
}): PendingPaymentUpdate[] {
  const { dataInicio, diaVencimento, formaPagamento, unpaidPayments, remainingAmount } = input

  if (!dataInicio) {
    throw new Error('Data de início é obrigatória')
  }

  if (!Number.isFinite(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) {
    throw new Error('Dia de vencimento inválido')
  }

  if (!Number.isFinite(remainingAmount) || remainingAmount < 0) {
    throw new Error('Saldo restante inválido')
  }

  if (unpaidPayments.length === 0) {
    return []
  }

  const valorBase = Number((remainingAmount / unpaidPayments.length).toFixed(2))
  const totalBase = Number((valorBase * unpaidPayments.length).toFixed(2))
  const remainder = Number((remainingAmount - totalBase).toFixed(2))

  return unpaidPayments.map((pagamento, index) => {
    const parcelaNumero = Number(pagamento.parcela_num)

    if (!Number.isFinite(parcelaNumero) || parcelaNumero <= 0) {
      throw new Error(`Parcela inválida para pagamento ${pagamento.id}`)
    }

    const dueBase = new Date(`${dataInicio}T12:00:00`)
    dueBase.setMonth(dueBase.getMonth() + parcelaNumero)
    const ultimoDiaMes = new Date(dueBase.getFullYear(), dueBase.getMonth() + 1, 0).getDate()
    const diaEfetivo = Math.min(diaVencimento, ultimoDiaMes)
    const newDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), diaEfetivo, 12, 0, 0)

    if (Number.isNaN(newDate.getTime())) {
      throw new Error(`Data de vencimento inválida para pagamento ${pagamento.id}`)
    }

    return {
      id: pagamento.id,
      valor: index === unpaidPayments.length - 1 ? Number((valorBase + remainder).toFixed(2)) : valorBase,
      forma: formaPagamento,
      data_vencimento: toIsoDate(newDate),
    }
  })
}
