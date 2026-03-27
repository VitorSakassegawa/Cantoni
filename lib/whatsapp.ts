function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  if (!phone) {
    return null
  }

  let digits = normalizeDigits(phone)

  if (!digits) {
    return null
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`
  }

  if (digits.length < 12 || digits.length > 13) {
    return null
  }

  return digits
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const normalized = normalizeWhatsAppPhone(phone)

  if (!normalized) {
    return null
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

function getPortalUrl(path: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://cantonies.com.br').replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appUrl}${normalizedPath}`
}

export function buildGeneralWhatsAppMessage(studentName: string) {
  return [
    `Olá, ${studentName}! Aqui é a equipe da Cantoni English School.`,
    '',
    'Estou entrando em contato por este canal para facilitar o seu acompanhamento no portal e na rotina acadêmica.',
    '',
    `Sempre que precisar, você também pode acessar: ${getPortalUrl('/login')}`,
  ].join('\n')
}

export function buildFirstAccessWhatsAppMessage(studentName: string) {
  return [
    `Olá, ${studentName}! Aqui é a equipe da Cantoni English School.`,
    '',
    'Seu link de primeiro acesso foi enviado para o e-mail cadastrado.',
    'Quando puder, verifique sua caixa de entrada e siga as instruções para definir sua senha inicial.',
    '',
    `Portal: ${getPortalUrl('/login')}`,
  ].join('\n')
}

export function buildPaymentWhatsAppMessage({
  studentName,
  amount,
  dueDate,
  installmentLabel,
}: {
  studentName: string
  amount: string
  dueDate: string
  installmentLabel: string
}) {
  return [
    `Olá, ${studentName}! Aqui é a equipe da Cantoni English School.`,
    '',
    `Passando para sinalizar que a ${installmentLabel} está disponível no portal no valor de ${amount}, com vencimento em ${dueDate}.`,
    '',
    `Você pode acompanhar os detalhes em: ${getPortalUrl('/aluno/pagamentos')}`,
  ].join('\n')
}
