import { formatCurrency, formatDateOnly } from '@/lib/utils'

export const LEGAL_REFERENCE_LINKS = [
  {
    label: 'CDC - Lei nº 8.078/1990',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
  {
    label: 'Código Civil - Lei nº 10.406/2002',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
]

export const CONTRACT_ACCEPTANCE_TERMS = [
  'confirmo que li integralmente esta versão emitida do contrato',
  'confirmo que os dados visíveis neste documento correspondem ao acordo apresentado no portal',
  'reconheço que este aceite fica registrado com data, versão e evidências técnicas de auditoria',
]

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
}

export function formatContractDays(days?: number[] | null) {
  if (!days || days.length === 0) {
    return 'a combinar entre as partes'
  }

  return days.map((day) => WEEKDAY_LABELS[day] || `dia ${day}`).join(', ')
}

export function buildPaymentSummary(payments: any[]) {
  if (!payments || payments.length === 0) {
    return 'Pagamento ainda não detalhado no portal.'
  }

  return payments
    .map((payment: any) => `${payment.parcela_num}. ${formatCurrency(Number(payment.valor || 0))} com vencimento em ${formatDateOnly(payment.data_vencimento)}`)
    .join('; ')
}

export function buildContractSections(input: {
  student: any
  teacher: any
  contract: any
  payments: any[]
  addenda: any[]
}) {
  const { student, teacher, contract, payments, addenda } = input
  const paymentCount = payments.length || 1
  const startDate = formatDateOnly(contract.data_inicio)
  const endDate = formatDateOnly(contract.data_fim)
  const daysLabel = formatContractDays(contract.dias_da_semana)
  const hasAddenda = (addenda || []).length > 0

  return [
    {
      title: '1. Partes e finalidade',
      body: `Este instrumento regula a prestação de serviços educacionais personalizados de ensino de língua estrangeira entre ${teacher.full_name || 'o professor'} e ${student.full_name || 'o aluno'}, com foco em transparência, boa-fé objetiva e clareza das informações essenciais do serviço.`,
    },
    {
      title: '2. Objeto e formato das aulas',
      body: `O objeto do contrato é a ministração de ${contract.aulas_totais} aula(s), no período de ${startDate} a ${endDate}, em regime ${contract.tipo_contrato === 'ad-hoc' ? 'personalizado' : 'regular'}, preferencialmente às ${contract.horario || 'horário a combinar'}, nos dias ${daysLabel}.`,
    },
    {
      title: '3. Valor e forma de pagamento',
      body: `O valor global contratado é de ${formatCurrency(Number(contract.valor || 0))}, com pagamento em ${paymentCount} parcela(s), pela forma ${contract.forma_pagamento || 'definida no portal'}, observando o fluxo financeiro registrado no sistema. Resumo atual das parcelas: ${buildPaymentSummary(payments)}.`,
    },
    {
      title: '4. Regras de agenda, cancelamento e remarcação',
      body: 'Cancelamentos informados com antecedência mínima de 2 horas não geram contabilização da aula como dada. Após esse prazo, a aula pode ser considerada realizada para fins de carga contratada. As remarcações seguem o limite mensal do plano contratado e dependem de disponibilidade operacional das partes.',
    },
    {
      title: '5. Materiais, participação e deveres do aluno',
      body: 'O aluno se compromete a participar das aulas, manter seus dados atualizados no portal, acompanhar tarefas e comunicações, e adquirir ou acessar o material didático indicado quando aplicável. O aproveitamento pedagógico depende também de dedicação extraclasse e frequência adequada.',
    },
    {
      title: '6. Alterações contratuais e aditivos',
      body: hasAddenda
        ? `Alterações financeiras posteriores à emissão do contrato, especialmente após parcelas pagas, devem ocorrer por aditivo expresso. O portal já registra ${addenda.length} aditivo(s), preservando o histórico de pagamentos realizados e reorganizando apenas o saldo em aberto.`
        : 'Alterações de valor, parcelamento, vencimento ou condições financeiras posteriores à emissão do contrato devem ser formalizadas por aditivo expresso, preservando o histórico já consolidado no portal.',
    },
    {
      title: '7. Vigência, renovação e encerramento',
      body: `A vigência contratual encerra-se em ${endDate}, podendo haver renovação mediante nova formalização. Situações de inadimplemento, mudanças de carga horária ou renegociação financeira devem ser tratadas no portal com antecedência razoável para evitar desencontro entre agenda, financeiro e histórico acadêmico.`,
    },
    {
      title: '8. Base de transparência contratual',
      body: 'Este modelo foi estruturado para privilegiar informação prévia, redação legível, coerência com a operação do portal e interpretação favorável ao aderente em caso de ambiguidade, em linha geral com deveres de transparência e boa-fé previstos na legislação civil e consumerista brasileira.',
    },
    {
      title: '9. Foro e observações finais',
      body: `Fica indicado o foro de ${teacher.city || 'Guarulhos/SP'} para dirimir controvérsias contratuais, sem prejuízo dos direitos do consumidor previstos em lei. Recomenda-se revisão jurídica personalizada antes do uso definitivo deste modelo em larga escala.`,
    },
  ]
}

export function buildEnrollmentDeclaration(input: {
  student: any
  teacher: any
  contract: any
}) {
  const { student, teacher, contract } = input
  const issueDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())

  return {
    title: 'Declaração de Matrícula',
    body: `Declaro, para os devidos fins, que ${student.full_name || 'o aluno'}, CPF ${student.cpf || 'não informado'}, encontra-se matriculado(a) no programa de aulas de língua estrangeira conduzido por ${teacher.full_name || 'o professor'}, no período de ${formatDateOnly(contract.data_inicio)} a ${formatDateOnly(contract.data_fim)}, com carga contratada de ${contract.aulas_totais} aula(s).`,
    complementary: `O contrato atualmente vinculado ao portal é o de nº ${contract.id}, em status ${contract.status}, com organização pedagógica registrada no ambiente digital da escola.`,
    issueDate,
  }
}

export function buildContractSnapshot(input: {
  student: any
  teacher: any
  contract: any
  payments: any[]
  addenda: any[]
}) {
  return {
    kind: 'contract',
    title: `Contrato #${input.contract.id}`,
    generatedAt: new Date().toISOString(),
    acceptanceTerms: CONTRACT_ACCEPTANCE_TERMS,
    student: {
      fullName: input.student?.full_name || 'Aluno',
      cpf: input.student?.cpf || 'não informado',
      email: input.student?.email || 'não informado',
      phone: input.student?.phone || 'não informado',
    },
    teacher: {
      fullName: input.teacher?.full_name || 'Professor responsável',
      cpf: input.teacher?.cpf || 'não informado',
      email: input.teacher?.email || 'não informado',
      phone: input.teacher?.phone || 'não informado',
      city: input.teacher?.city || 'Guarulhos/SP',
    },
    summary: {
      contractId: input.contract.id,
      startDate: input.contract.data_inicio,
      endDate: input.contract.data_fim,
      lessons: input.contract.aulas_totais,
      totalValue: Number(input.contract.valor || 0),
      paymentMethod: input.contract.forma_pagamento || 'a combinar',
    },
    sections: buildContractSections(input),
    addenda: (input.addenda || []).map((entry: any) => ({
      id: entry.id,
      previousOpenValue: Number(entry.previous_open_value || 0),
      newOpenValue: Number(entry.new_open_value || 0),
      previousOpenInstallments: entry.previous_open_installments,
      newOpenInstallments: entry.new_open_installments,
      firstDueDate: entry.first_due_date,
    })),
    legalReferences: LEGAL_REFERENCE_LINKS,
  }
}

export function buildDeclarationSnapshot(input: {
  student: any
  teacher: any
  contract: any
}) {
  const declaration = buildEnrollmentDeclaration(input)

  return {
    kind: 'enrollment_declaration',
    title: declaration.title,
    generatedAt: new Date().toISOString(),
    teacher: {
      fullName: input.teacher?.full_name || 'Professor responsável',
      cpf: input.teacher?.cpf || 'não informado',
      email: input.teacher?.email || 'não informado',
      city: input.teacher?.city || 'Guarulhos/SP',
    },
    contract: {
      id: input.contract.id,
      startDate: input.contract.data_inicio,
      endDate: input.contract.data_fim,
      status: input.contract.status,
      lessons: input.contract.aulas_totais,
    },
    body: declaration.body,
    complementary: declaration.complementary,
    issueDate: declaration.issueDate,
  }
}
