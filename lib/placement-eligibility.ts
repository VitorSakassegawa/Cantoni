type PlacementContractWindow = {
  status?: string | null
  data_inicio?: string | null
  data_fim?: string | null
}

export type PlacementInviteWindow = {
  status?: string | null
  valid_from?: string | null
  valid_until?: string | null
}

export type PlacementEligibilityReason =
  | 'first_test'
  | 'new_contract'
  | 'contract_end'
  | 'semester_rollover'
  | 'professor_invite'
  | 'professor_approved'
  | 'blocked'

export type PlacementEligibilityResult = {
  allowed: boolean
  reason: PlacementEligibilityReason
  title: string
  description: string
}

function getSemesterKey(date: Date) {
  const semester = date.getMonth() <= 5 ? 'S1' : 'S2'
  return `${date.getFullYear()}-${semester}`
}

function formatInviteDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function evaluatePlacementEligibility(input: {
  placementTestCompleted?: boolean | null
  latestResultAt?: string | null
  contracts?: PlacementContractWindow[]
  invites?: PlacementInviteWindow[]
  now?: Date
}): PlacementEligibilityResult {
  const now = input.now || new Date()
  const contracts = input.contracts || []
  const pendingInvites = (input.invites || []).filter((invite) => (invite.status || 'pending') === 'pending')
  const latestResultDate = input.latestResultAt ? new Date(input.latestResultAt) : null

  if (!latestResultDate) {
    return {
      allowed: true,
      reason: 'first_test',
      title: 'Primeiro nivelamento liberado',
      description: 'Seu primeiro teste pode ser feito diretamente no portal.',
    }
  }

  const hasNewContract = contracts.some((contract) => {
    if (!contract.data_inicio) return false
    return new Date(contract.data_inicio).getTime() > latestResultDate.getTime()
  })

  if (hasNewContract) {
    return {
      allowed: true,
      reason: 'new_contract',
      title: 'Novo contrato iniciado',
      description: 'Um novo contrato foi identificado depois do seu último teste, então o nivelamento foi liberado.',
    }
  }

  const hasContractEnded = contracts.some((contract) => {
    if (!contract.data_fim) return false
    const endDate = new Date(contract.data_fim)
    return endDate.getTime() >= latestResultDate.getTime() && now.getTime() >= endDate.getTime()
  })

  if (hasContractEnded) {
    return {
      allowed: true,
      reason: 'contract_end',
      title: 'Encerramento de contrato',
      description: 'O portal liberou um novo teste porque um contrato já foi encerrado desde o último nivelamento.',
    }
  }

  if (getSemesterKey(now) !== getSemesterKey(latestResultDate)) {
    return {
      allowed: true,
      reason: 'semester_rollover',
      title: 'Virada de semestre',
      description: 'No fechamento de semestre, um novo teste pode ser realizado para recalibrar seu nível atual.',
    }
  }

  // Manual release: an explicit professor invite, optionally bounded to a
  // validity window. Consumed (status='used') when the test is completed.
  const activeInvite = pendingInvites.find((invite) => {
    if (invite.valid_from && now.getTime() < new Date(invite.valid_from).getTime()) return false
    if (invite.valid_until && now.getTime() > new Date(invite.valid_until).getTime()) return false
    return true
  })

  if (activeInvite) {
    return {
      allowed: true,
      reason: 'professor_invite',
      title: 'Convite do professor ativo',
      description: activeInvite.valid_until
        ? `Seu professor liberou um novo teste, válido até ${formatInviteDate(activeInvite.valid_until)}.`
        : 'Seu professor liberou um novo teste de nivelamento para você.',
    }
  }

  // Legacy manual release (boolean flag), kept so students unlocked before the
  // invite system existed are not re-blocked.
  if (input.placementTestCompleted === false) {
    return {
      allowed: true,
      reason: 'professor_approved',
      title: 'Teste liberado pelo professor',
      description: 'Seu professor aprovou um novo teste ad hoc para revisar seu momento atual.',
    }
  }

  // A pending invite whose window hasn't opened yet: still blocked, but tell
  // the student when it opens.
  const scheduledInvite = pendingInvites.find(
    (invite) => invite.valid_from && now.getTime() < new Date(invite.valid_from).getTime()
  )

  if (scheduledInvite?.valid_from) {
    return {
      allowed: false,
      reason: 'blocked',
      title: 'Novo teste agendado',
      description: `Seu professor agendou um novo teste com liberação a partir de ${formatInviteDate(scheduledInvite.valid_from)}.`,
    }
  }

  return {
    allowed: false,
    reason: 'blocked',
    title: 'Novo teste ainda não liberado',
    description:
      'Refações ad hoc dependem de aprovação do professor. Fora isso, novos testes acontecem no início de um contrato, ao fim do contrato ou na virada de semestre.',
  }
}
