import { formatCurrency, formatDateOnly } from '@/lib/utils'

export const LEGAL_REFERENCE_LINKS = [
  {
    label: 'CDC - Lei no 8.078/1990',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
  {
    label: 'Codigo Civil - Lei no 10.406/2002',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
]

export const CONTRACT_ACCEPTANCE_TERMS = [
  'confirmo que li integralmente esta versao emitida do contrato',
  'confirmo que os dados visiveis neste documento correspondem ao acordo apresentado no portal',
  'reconheco que este aceite fica registrado com data, versao e evidencias tecnicas de auditoria',
]

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terca-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sabado',
}

function getPersonName(person: any, fallback: string) {
  return person?.full_name || fallback
}

function getPersonCpf(person: any) {
  return person?.cpf || 'nao informado'
}

function getPersonEmail(person: any) {
  return person?.email || 'nao informado'
}

function getPersonPhone(person: any) {
  return person?.phone || 'nao informado'
}

function getTeacherCity(teacher: any) {
  return teacher?.city || 'Guarulhos/SP'
}

export function formatContractDays(days?: number[] | null) {
  if (!days || days.length === 0) {
    return 'a combinar entre as partes'
  }

  return days.map((day) => WEEKDAY_LABELS[day] || `dia ${day}`).join(', ')
}

export function buildPaymentSummary(payments: any[]) {
  if (!payments || payments.length === 0) {
    return 'Pagamento ainda nao detalhado no portal.'
  }

  return payments
    .map(
      (payment: any) =>
        `${payment.parcela_num}. ${formatCurrency(Number(payment.valor || 0))} com vencimento em ${formatDateOnly(payment.data_vencimento)}`
    )
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
      body: `Este instrumento regula a prestacao de servicos educacionais personalizados de ensino de lingua estrangeira entre ${getPersonName(teacher, 'o professor')} e ${getPersonName(student, 'o aluno')}, com foco em transparencia, boa-fe objetiva e clareza das informacoes essenciais do servico.`,
    },
    {
      title: '2. Objeto e formato das aulas',
      body: `O objeto do contrato e a ministracao de ${contract.aulas_totais} aula(s), no periodo de ${startDate} a ${endDate}, em regime ${contract.tipo_contrato === 'ad-hoc' ? 'personalizado' : 'regular'}, preferencialmente as ${contract.horario || 'horario a combinar'}, nos dias ${daysLabel}.`,
    },
    {
      title: '3. Valor e forma de pagamento',
      body: `O valor global contratado e de ${formatCurrency(Number(contract.valor || 0))}, com pagamento em ${paymentCount} parcela(s), pela forma ${contract.forma_pagamento || 'definida no portal'}, observando o fluxo financeiro registrado no sistema. Resumo atual das parcelas: ${buildPaymentSummary(payments)}.`,
    },
    {
      title: '4. Regras de agenda, cancelamento e remarcacao',
      body: 'Cancelamentos informados com antecedencia minima de 2 horas nao geram contabilizacao da aula como dada. Apos esse prazo, a aula pode ser considerada realizada para fins de carga contratada. As remarcacoes seguem o limite mensal do plano contratado e dependem de disponibilidade operacional das partes.',
    },
    {
      title: '5. Materiais, participacao e deveres do aluno',
      body: 'O aluno se compromete a participar das aulas, manter seus dados atualizados no portal, acompanhar tarefas e comunicacoes, e adquirir ou acessar o material didatico indicado quando aplicavel. O aproveitamento pedagogico depende tambem de dedicacao extraclasse e frequencia adequada.',
    },
    {
      title: '6. Alteracoes contratuais e aditivos',
      body: hasAddenda
        ? `Alteracoes financeiras posteriores a emissao do contrato, especialmente apos parcelas pagas, devem ocorrer por aditivo expresso. O portal ja registra ${addenda.length} aditivo(s), preservando o historico de pagamentos realizados e reorganizando apenas o saldo em aberto.`
        : 'Alteracoes de valor, parcelamento, vencimento ou condicoes financeiras posteriores a emissao do contrato devem ser formalizadas por aditivo expresso, preservando o historico ja consolidado no portal.',
    },
    {
      title: '7. Vigencia, renovacao e encerramento',
      body: `A vigencia contratual encerra-se em ${endDate}, podendo haver renovacao mediante nova formalizacao. Situacoes de inadimplemento, mudancas de carga horaria ou renegociacao financeira devem ser tratadas no portal com antecedencia razoavel para evitar desencontro entre agenda, financeiro e historico academico.`,
    },
    {
      title: '8. Base de transparencia contratual',
      body: 'Este modelo foi estruturado para privilegiar informacao previa, redacao legivel, coerencia com a operacao do portal e interpretacao favoravel ao aderente em caso de ambiguidade, em linha geral com deveres de transparencia e boa-fe previstos na legislacao civil e consumerista brasileira.',
    },
    {
      title: '9. Foro e observacoes finais',
      body: `Fica indicado o foro de ${getTeacherCity(teacher)} para dirimir controversias contratuais, sem prejuizo dos direitos do consumidor previstos em lei. Recomenda-se revisao juridica personalizada antes do uso definitivo deste modelo em larga escala.`,
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
    title: 'Declaracao de Matricula',
    body: `Declaro, para os devidos fins, que ${getPersonName(student, 'o aluno')}, CPF ${getPersonCpf(student)}, encontra-se matriculado(a) no programa de aulas de lingua estrangeira conduzido por ${getPersonName(teacher, 'o professor')}, no periodo de ${formatDateOnly(contract.data_inicio)} a ${formatDateOnly(contract.data_fim)}, com carga contratada de ${contract.aulas_totais} aula(s).`,
    complementary: `O contrato atualmente vinculado ao portal e o de no ${contract.id}, em status ${contract.status}, com organizacao pedagogica registrada no ambiente digital da escola.`,
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
      fullName: getPersonName(input.student, 'Aluno'),
      cpf: getPersonCpf(input.student),
      email: getPersonEmail(input.student),
      phone: getPersonPhone(input.student),
    },
    teacher: {
      fullName: getPersonName(input.teacher, 'Professor responsavel'),
      cpf: getPersonCpf(input.teacher),
      email: getPersonEmail(input.teacher),
      phone: getPersonPhone(input.teacher),
      city: getTeacherCity(input.teacher),
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
      fullName: getPersonName(input.teacher, 'Professor responsavel'),
      cpf: getPersonCpf(input.teacher),
      email: getPersonEmail(input.teacher),
      city: getTeacherCity(input.teacher),
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
