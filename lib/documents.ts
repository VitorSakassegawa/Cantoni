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

function getWeeklyFrequency(contract: any) {
  return Number(contract?.planos?.freq_semana || 1)
}

function getRescheduleLimit(contract: any) {
  return Number(contract?.planos?.remarca_max_mes || getWeeklyFrequency(contract))
}

function getFirstDueDate(payments: any[]) {
  return payments?.[0]?.data_vencimento ? formatDateOnly(payments[0].data_vencimento) : 'a definir'
}

function getPaymentMethodLabel(method?: string | null) {
  const normalized = (method || 'a combinar').toLowerCase()
  if (normalized === 'pix') return 'Pix'
  if (normalized === 'cartao') return 'Cartao'
  if (normalized === 'boleto') return 'Boleto'
  return method || 'a combinar'
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
  const weeklyFrequency = getWeeklyFrequency(contract)
  const rescheduleLimit = getRescheduleLimit(contract)
  const firstDueDate = getFirstDueDate(payments)
  const hasAddenda = (addenda || []).length > 0

  return [
    {
      title: '1. Partes e finalidade',
      body: `O presente instrumento regula a prestacao de servicos educacionais personalizados de ensino de lingua inglesa entre ${getPersonName(teacher, 'o professor')} (Contratado, Pessoa Fisica, CPF ${getPersonCpf(teacher)}, e-mail ${getPersonEmail(teacher)}, tel. ${getPersonPhone(teacher)}) e ${getPersonName(student, 'o aluno')} (Contratante, CPF ${getPersonCpf(student)}), com foco em transparencia, boa-fe objetiva e clareza das informacoes essenciais do servico.`,
    },
    {
      title: '2. Objeto e formato das aulas',
      body: `O objeto do contrato e a ministracao de ${contract.aulas_totais} (${String(contract.aulas_totais)}) aulas de ingles na modalidade on-line, no periodo de ${startDate} a ${endDate}, preferencialmente as ${contract.horario || 'horario a combinar'}, nos dias ${daysLabel}, em regime ${contract.tipo_contrato === 'ad-hoc' ? 'personalizado' : `personalizado (${weeklyFrequency} aula(s) por semana)`}. A plataforma de videoconferencia sera acordada entre as partes antes do inicio das atividades.`,
    },
    {
      title: '3. Valor e forma de pagamento',
      body: `O valor global contratado e de ${formatCurrency(Number(contract.valor || 0))}, a ser pago em ${paymentCount} parcela(s) via ${getPaymentMethodLabel(contract.forma_pagamento)}, com vencimento inicial em ${firstDueDate}. O nao pagamento na data acordada podera ensejar suspensao das aulas ate regularizacao, sem prejuizo dos demais direitos do Contratado. Resumo atual das parcelas: ${buildPaymentSummary(payments)}.`,
    },
    {
      title: '4. Cancelamento, remarcacao e reposicao',
      body: `4.1 Cancelamento pelo Contratante: cancelamentos comunicados com antecedencia minima de 2 horas antes do horario de inicio da aula nao serao contabilizados como aula dada. Apos esse prazo, a aula sera considerada realizada para todos os fins contratuais, sem direito a reembolso ou reposicao. 4.2 Limite mensal: para este contrato, o Contratante tera direito a ate ${rescheduleLimit} cancelamento(s) mensal(is) sem prejuizo. Cancelamentos alem do limite serao contabilizados como aulas dadas. 4.3 Cancelamento pelo Contratado: se a iniciativa for do Contratado, a aula sera reposta em data e horario acordados entre as partes, conforme disponibilidade mutua, sem qualquer onus adicional ao Contratante.`,
    },
    {
      title: '5. Direito de arrependimento',
      body: 'Em conformidade com o art. 49 do Codigo de Defesa do Consumidor, o Contratante podera exercer o direito de arrependimento em ate 7 dias corridos contados da assinatura deste instrumento ou do pagamento, o que ocorrer primeiro, desde que nenhuma aula tenha sido ministrada. Caso ao menos uma aula ja tenha sido realizada, o direito de arrependimento nao se aplica, sendo devida a cobranca proporcional as aulas efetivamente prestadas.',
    },
    {
      title: '6. Rescisao e multa',
      body: 'A rescisao antecipada por iniciativa do Contratante, apos o inicio das aulas, implicara o pagamento proporcional as aulas ja realizadas, acrescido de multa compensatoria equivalente a 10% do valor das aulas restantes. A rescisao por iniciativa do Contratado sem justa causa obrigara a devolucao proporcional dos valores recebidos pelas aulas nao ministradas.',
    },
    {
      title: '7. Materiais, participacao e deveres do aluno',
      body: 'O aluno se compromete a participar das aulas, manter seus dados atualizados no portal, acompanhar tarefas e comunicacoes, e adquirir ou acessar o material didatico indicado quando aplicavel. O aproveitamento pedagogico depende tambem de dedicacao extraclasse e frequencia adequada.',
    },
    {
      title: '8. Alteracoes contratuais e aditivos',
      body: hasAddenda
        ? `Alteracoes financeiras posteriores a emissao do contrato, especialmente apos parcelas pagas, devem ocorrer por aditivo expresso. O portal ja registra ${addenda.length} aditivo(s), preservando o historico de pagamentos realizados e reorganizando apenas o saldo em aberto.`
        : 'Alteracoes de valor, parcelamento, vencimento ou condicoes financeiras posteriores a emissao do contrato devem ser formalizadas por aditivo expresso, preservando o historico ja consolidado no portal.',
    },
    {
      title: '9. Vigencia, renovacao e encerramento',
      body: `A vigencia contratual encerra-se em ${endDate}, podendo haver renovacao mediante nova formalizacao. Situacoes de inadimplemento, mudancas de carga horaria ou renegociacao financeira devem ser tratadas no portal com antecedencia razoavel para evitar desencontro entre agenda, financeiro e historico academico.`,
    },
    {
      title: '10. Protecao de dados pessoais (LGPD)',
      body: 'Os dados pessoais coletados neste contrato, como nome, CPF, e-mail e telefone, serao utilizados exclusivamente para identificacao das partes, gestao da relacao contratual e comunicacoes inerentes ao servico, em conformidade com a Lei no 13.709/2018. Os dados nao serao compartilhados com terceiros sem consentimento expresso do titular, salvo obrigacao legal.',
    },
    {
      title: '11. Base de transparencia contratual',
      body: 'Este modelo foi estruturado para privilegiar informacao previa, redacao legivel, coerencia com a operacao do portal e interpretacao favoravel ao aderente em caso de ambiguidade, em linha com deveres de transparencia e boa-fe previstos no CDC e no Codigo Civil.',
    },
    {
      title: '12. Foro',
      body: `Fica eleito o foro da Comarca de ${getTeacherCity(teacher)}, domicilio do Contratado, para dirimir quaisquer controversias oriundas deste instrumento, sem prejuizo dos direitos do consumidor previstos em lei, incluindo a faculdade de ajuizamento no domicilio do Contratante conforme art. 101, I, do CDC.`,
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
      paymentMethod: getPaymentMethodLabel(input.contract.forma_pagamento),
      installmentCount: input.payments?.length || 1,
      firstDueDate: input.payments?.[0]?.data_vencimento || null,
      weeklyFrequency: getWeeklyFrequency(input.contract),
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
