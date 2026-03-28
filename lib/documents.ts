import { getContractCancellationClause } from '@/lib/document-text'
import { formatCurrency, formatDateOnly } from '@/lib/utils'

export type ContractSection = {
  title: string
  body?: string
  items?: string[]
}

type DocumentPerson = {
  full_name?: string | null
  cpf?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
}

type DocumentPlan = {
  freq_semana?: number | null
  remarca_max_mes?: number | null
}

type DocumentContract = {
  id: number
  aulas_totais: number
  data_inicio: string
  data_fim: string
  horario?: string | null
  tipo_contrato?: string | null
  valor?: number | string | null
  forma_pagamento?: string | null
  status?: string | null
  dias_da_semana?: number[] | null
  planos?: DocumentPlan | null
}

type DocumentPayment = {
  parcela_num: number
  valor?: number | string | null
  data_vencimento: string
}

type DocumentAddendum = {
  id: number
  previous_open_value?: number | string | null
  new_open_value?: number | string | null
  previous_open_installments?: number | null
  new_open_installments?: number | null
  first_due_date?: string | null
}

type DocumentCancellation = {
  id: number
  effective_date: string
  reason_label: string
  reason_details?: string | null
  notes?: string | null
  outstanding_action: string
  credit_action: string
  paid_amount?: number | string | null
  consumed_value?: number | string | null
  outstanding_value?: number | string | null
  credit_value?: number | string | null
  completed_lessons?: number | null
  future_lessons_cancelled?: number | null
}

export const LEGAL_REFERENCE_LINKS = [
  {
    label: 'CDC - Lei n.º 8.078/1990',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
  {
    label: 'Código Civil - Lei n.º 10.406/2002',
    href: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
]

export const CONTRACT_ACCEPTANCE_TERMS = [
  'Confirmo que li integralmente esta versão emitida do contrato.',
  'Confirmo que os dados visíveis neste documento correspondem ao acordo apresentado no portal.',
  'Reconheço que este aceite fica registrado com data, versão e evidências técnicas de auditoria.',
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

const LEGAL_TEACHER_NAME = 'Gabriel de Oliveira Cantoni'

const PT_BR_UNITS = [
  'zero',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
]

const PT_BR_TEENS = [
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
]

const PT_BR_TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
]

const PT_BR_HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
]

function getPersonName(person: DocumentPerson | null | undefined, fallback: string) {
  return person?.full_name || fallback
}

function getPersonCpf(person: DocumentPerson | null | undefined) {
  return person?.cpf || 'não informado'
}

function getPersonEmail(person: DocumentPerson | null | undefined) {
  return person?.email || 'não informado'
}

function getPersonPhone(person: DocumentPerson | null | undefined) {
  return person?.phone || 'não informado'
}

function getTeacherCity(teacher: DocumentPerson | null | undefined) {
  return teacher?.city || 'Guarulhos/SP'
}

function getTeacherLegalName(teacher: DocumentPerson | null | undefined) {
  return teacher?.cpf ? LEGAL_TEACHER_NAME : getPersonName(teacher, 'o professor')
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function numberToPortugueseWords(value: number): string {
  if (!Number.isFinite(value)) return String(value)

  const normalized = Math.trunc(Math.abs(value))

  if (normalized < 10) return PT_BR_UNITS[normalized]
  if (normalized < 20) return PT_BR_TEENS[normalized - 10]

  if (normalized < 100) {
    const tens = Math.floor(normalized / 10)
    const units = normalized % 10
    return units === 0 ? PT_BR_TENS[tens] : `${PT_BR_TENS[tens]} e ${PT_BR_UNITS[units]}`
  }

  if (normalized === 100) return 'cem'

  if (normalized < 1000) {
    const hundreds = Math.floor(normalized / 100)
    const remainder = normalized % 100
    return remainder === 0
      ? PT_BR_HUNDREDS[hundreds]
      : `${PT_BR_HUNDREDS[hundreds]} e ${numberToPortugueseWords(remainder)}`
  }

  return String(normalized)
}

function formatCountWithWords(count: number) {
  return `${count} (${numberToPortugueseWords(count)})`
}

function getWeeklyFrequency(contract: DocumentContract) {
  return Number(contract.planos?.freq_semana || 1)
}

function getRescheduleLimit(contract: DocumentContract) {
  return Number(contract.planos?.remarca_max_mes || getWeeklyFrequency(contract))
}

function getFirstDueDate(payments: DocumentPayment[]) {
  return payments[0]?.data_vencimento ? formatDateOnly(payments[0].data_vencimento) : 'a definir'
}

function getPaymentMethodLabel(method?: string | null) {
  const normalized = (method || 'a combinar').toLowerCase()
  if (normalized === 'pix') return 'Pix'
  if (normalized === 'cartao') return 'Cartão'
  if (normalized === 'boleto') return 'Boleto'
  return method || 'a combinar'
}

function getContractFormatLabel(contract: DocumentContract) {
  if (contract.tipo_contrato === 'ad-hoc') {
    return 'personalizado'
  }

  const weeklyFrequency = getWeeklyFrequency(contract)
  return `personalizado (${formatCountWithWords(weeklyFrequency)} ${pluralize(weeklyFrequency, 'aula')} por semana)`
}

export function formatContractDays(days?: number[] | null) {
  if (!days || days.length === 0) {
    return 'a combinar entre as partes'
  }

  return days.map((day) => WEEKDAY_LABELS[day] || `dia ${day}`).join(', ')
}

export function buildPaymentSummary(payments: DocumentPayment[]) {
  if (!payments.length) {
    return 'Pagamento ainda não detalhado no portal.'
  }

  return payments
    .map(
      (payment) =>
        `${payment.parcela_num}. ${formatCurrency(Number(payment.valor || 0))} com vencimento em ${formatDateOnly(payment.data_vencimento)}`
    )
    .join('; ')
}

export function buildContractSections(input: {
  student: DocumentPerson | null | undefined
  teacher: DocumentPerson | null | undefined
  contract: DocumentContract
  payments: DocumentPayment[]
  addenda: DocumentAddendum[]
}): ContractSection[] {
  const { student, teacher, contract, payments, addenda } = input
  const paymentCount = payments.length || 1
  const startDate = formatDateOnly(contract.data_inicio)
  const endDate = formatDateOnly(contract.data_fim)
  const daysLabel = formatContractDays(contract.dias_da_semana)
  const rescheduleLimit = getRescheduleLimit(contract)
  const firstDueDate = getFirstDueDate(payments)
  const hasAddenda = addenda.length > 0

  return [
    {
      title: '1. Partes e finalidade',
      body: `O presente instrumento regula a prestação de serviços educacionais personalizados de ensino de língua inglesa entre ${getTeacherLegalName(teacher)} (Contratado, Pessoa Física, CPF ${getPersonCpf(teacher)}, e-mail ${getPersonEmail(teacher)}, tel. ${getPersonPhone(teacher)}) e ${getPersonName(student, 'o aluno')} (Contratante, CPF ${getPersonCpf(student)}), com foco em transparência, boa-fé objetiva e clareza das informações essenciais do serviço.`,
    },
    {
      title: '2. Objeto e formato das aulas',
      body: `O objeto do contrato é a ministração de ${formatCountWithWords(contract.aulas_totais)} aulas de inglês na modalidade on-line, no período de ${startDate} a ${endDate}, preferencialmente às ${contract.horario || '18h00'}, nos dias ${daysLabel}, em regime ${getContractFormatLabel(contract)}. A plataforma de videoconferência será acordada entre as partes antes do início das atividades.`,
    },
    {
      title: '3. Valor e forma de pagamento',
      body: `O valor global contratado é de ${formatCurrency(Number(contract.valor || 0))}, a ser pago em ${formatCountWithWords(paymentCount)} ${pluralize(paymentCount, 'parcela')} via ${getPaymentMethodLabel(contract.forma_pagamento)}, com vencimento inicial em ${firstDueDate}. O não pagamento na data acordada poderá ensejar suspensão das aulas até regularização, sem prejuízo dos demais direitos do Contratado.\n\nResumo atual das parcelas: ${buildPaymentSummary(payments)}.`,
    },
    {
      title: '4. Cancelamento, remarcação e reposição',
      items: [
        '4.1 Cancelamento pelo Contratante: cancelamentos comunicados com antecedência mínima de 2 (duas) horas antes do horário de início da aula não serão contabilizados como aula dada. Após esse prazo, a aula será considerada realizada para todos os fins contratuais, sem direito a reembolso ou reposição.',
        `4.2 Limite mensal: para este contrato, o Contratante terá direito a até ${formatCountWithWords(rescheduleLimit)} ${pluralize(rescheduleLimit, 'cancelamento')} mensal${rescheduleLimit === 1 ? '' : 'es'} sem prejuízo. Cancelamentos além do limite serão contabilizados como aulas dadas.`,
        '4.3 Cancelamento pelo Contratado: se a iniciativa for do Contratado, a aula será reposta em data e horário acordados entre as partes, conforme disponibilidade mútua, sem qualquer ônus adicional ao Contratante.',
      ],
    },
    {
      title: '5. Direito de arrependimento',
      body: 'Em conformidade com o art. 49 do Código de Defesa do Consumidor, o Contratante poderá exercer o direito de arrependimento em até 7 (sete) dias corridos contados da assinatura deste instrumento ou do pagamento, o que ocorrer primeiro, desde que nenhuma aula tenha sido ministrada. Caso ao menos uma aula já tenha sido realizada, o direito de arrependimento não se aplica, sendo devida a cobrança proporcional às aulas efetivamente prestadas.',
    },
    {
      title: '6. Rescisão e multa',
      body: getContractCancellationClause(),
    },
    {
      title: '7. Materiais, participação e deveres do aluno',
      body: 'O aluno se compromete a participar das aulas, manter seus dados atualizados no portal, acompanhar tarefas e comunicações, e adquirir ou acessar o material didático indicado quando aplicável. O aproveitamento pedagógico depende também de dedicação extraclasse e frequência adequada.',
    },
    {
      title: '8. Alterações contratuais e aditivos',
      body: hasAddenda
        ? `Alterações financeiras posteriores à emissão do contrato, especialmente após parcelas pagas, devem ocorrer por aditivo expresso. O portal já registra ${formatCountWithWords(addenda.length)} ${pluralize(addenda.length, 'aditivo')}, preservando o histórico de pagamentos realizados e reorganizando apenas o saldo em aberto.`
        : 'Alterações de valor, parcelamento, vencimento ou condições financeiras posteriores à emissão do contrato devem ser formalizadas por aditivo expresso, preservando o histórico já consolidado no portal.',
    },
    {
      title: '9. Vigência, renovação e encerramento',
      body: `A vigência contratual encerra-se em ${endDate}, podendo haver renovação mediante nova formalização. Situações de inadimplemento, mudanças de carga horária ou renegociação financeira devem ser tratadas no portal com antecedência razoável para evitar desencontro entre agenda, financeiro e histórico acadêmico.`,
    },
    {
      title: '10. Proteção de dados pessoais (LGPD)',
      body: 'Os dados pessoais coletados neste contrato, como nome, CPF, e-mail e telefone, serão utilizados exclusivamente para identificação das partes, gestão da relação contratual e comunicações inerentes ao serviço, em conformidade com a Lei n.º 13.709/2018. Os dados não serão compartilhados com terceiros sem consentimento expresso do titular, salvo obrigação legal.',
    },
    {
      title: '11. Base de transparência contratual',
      body: 'Este modelo foi estruturado para privilegiar informação prévia, redação legível, coerência com a operação do portal e interpretação favorável ao aderente em caso de ambiguidade, em linha com deveres de transparência e boa-fé previstos no CDC e no Código Civil.',
    },
    {
      title: '12. Foro',
      body: `Fica eleito o foro da Comarca de ${getTeacherCity(teacher)}, domicílio do Contratado, para dirimir quaisquer controvérsias oriundas deste instrumento, sem prejuízo dos direitos do consumidor previstos em lei, incluindo a faculdade de ajuizamento no domicílio do Contratante conforme art. 101, I, do CDC.`,
    },
  ]
}

export function buildEnrollmentDeclaration(input: {
  student: DocumentPerson | null | undefined
  teacher: DocumentPerson | null | undefined
  contract: DocumentContract
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
    body: `Declaro, para os devidos fins, que ${getPersonName(student, 'o aluno')}, CPF ${getPersonCpf(student)}, encontra-se matriculado(a) no programa de aulas de língua estrangeira conduzido por ${getTeacherLegalName(teacher)}, no período de ${formatDateOnly(contract.data_inicio)} a ${formatDateOnly(contract.data_fim)}, com carga contratada de ${formatCountWithWords(contract.aulas_totais)} ${pluralize(contract.aulas_totais, 'aula')}.`,
    complementary: `O contrato atualmente vinculado ao portal é o de n.º ${contract.id}, em status ${contract.status}, com organização pedagógica registrada no ambiente digital da escola.`,
    issueDate,
  }
}

export function buildContractSnapshot(input: {
  student: DocumentPerson | null | undefined
  teacher: DocumentPerson | null | undefined
  contract: DocumentContract
  payments: DocumentPayment[]
  addenda: DocumentAddendum[]
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
      fullName: getTeacherLegalName(input.teacher),
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
      paymentMethod: getPaymentMethodLabel(input.contract.forma_pagamento),
      installmentCount: input.payments.length || 1,
      firstDueDate: input.payments[0]?.data_vencimento || null,
      weeklyFrequency: getWeeklyFrequency(input.contract),
    },
    sections: buildContractSections(input),
    addenda: input.addenda.map((entry) => ({
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
  student: DocumentPerson | null | undefined
  teacher: DocumentPerson | null | undefined
  contract: DocumentContract
}) {
  const declaration = buildEnrollmentDeclaration(input)

  return {
    kind: 'enrollment_declaration',
    title: declaration.title,
    generatedAt: new Date().toISOString(),
    teacher: {
      fullName: getTeacherLegalName(input.teacher),
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

export function buildCancellationNoticeSnapshot(input: {
  student: DocumentPerson | null | undefined
  teacher: DocumentPerson | null | undefined
  contract: DocumentContract
  cancellation: DocumentCancellation
}) {
  const { student, teacher, contract, cancellation } = input

  return {
    kind: 'cancellation_notice',
    title: `Encerramento contratual #${contract.id}`,
    generatedAt: new Date().toISOString(),
    student: {
      fullName: getPersonName(student, 'Aluno'),
      cpf: getPersonCpf(student),
      email: getPersonEmail(student),
      phone: getPersonPhone(student),
    },
    teacher: {
      fullName: getTeacherLegalName(teacher),
      cpf: getPersonCpf(teacher),
      email: getPersonEmail(teacher),
      phone: getPersonPhone(teacher),
      city: getTeacherCity(teacher),
    },
    contract: {
      id: contract.id,
      startDate: contract.data_inicio,
      endDate: contract.data_fim,
      status: contract.status,
      lessons: contract.aulas_totais,
      totalValue: Number(contract.valor || 0),
    },
    cancellation: {
      id: cancellation.id,
      effectiveDate: cancellation.effective_date,
      reasonLabel: cancellation.reason_label,
      reasonDetails: cancellation.reason_details || null,
      notes: cancellation.notes || null,
      outstandingAction: cancellation.outstanding_action,
      creditAction: cancellation.credit_action,
      paidAmount: Number(cancellation.paid_amount || 0),
      consumedValue: Number(cancellation.consumed_value || 0),
      outstandingValue: Number(cancellation.outstanding_value || 0),
      creditValue: Number(cancellation.credit_value || 0),
      completedLessons: Number(cancellation.completed_lessons || 0),
      futureLessonsCancelled: Number(cancellation.future_lessons_cancelled || 0),
    },
    sections: [
      {
        title: '1. Encerramento registrado',
        body: `Fica registrado o encerramento do contrato n.º ${contract.id}, com data efetiva em ${formatDateOnly(cancellation.effective_date)}, no contexto operacional da Cantoni English School.`,
      },
      {
        title: '2. Motivo informado',
        body: cancellation.reason_details
          ? `${cancellation.reason_label}. Detalhamento complementar: ${cancellation.reason_details}`
          : cancellation.reason_label,
      },
      {
        title: '3. Tratamento financeiro',
        items: [
          `Valor pago até a data do encerramento: ${formatCurrency(Number(cancellation.paid_amount || 0))}.`,
          `Valor consumido pelas aulas efetivamente ministradas: ${formatCurrency(Number(cancellation.consumed_value || 0))}.`,
          `Saldo em aberto considerado no fechamento: ${formatCurrency(Number(cancellation.outstanding_value || 0))}.`,
          `Crédito estimado em favor do aluno: ${formatCurrency(Number(cancellation.credit_value || 0))}.`,
        ],
      },
      {
        title: '4. Tratamento acadêmico',
        items: [
          `Aulas concluídas até o encerramento: ${Number(cancellation.completed_lessons || 0)}.`,
          `Aulas futuras canceladas automaticamente: ${Number(cancellation.future_lessons_cancelled || 0)}.`,
        ],
      },
      {
        title: '5. Observações internas registradas',
        body: cancellation.notes || 'Sem observações adicionais registradas neste encerramento.',
      },
    ],
    issueDate: new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date()),
  }
}
