import 'server-only'
import { Resend } from 'resend'

type EmailPayload = Record<string, unknown>
type EmailResponse = { data: null; error: null }
type EmailSender = {
  emails: {
    send: (payload: EmailPayload) => Promise<EmailResponse>
  }
}

type EmailTone = 'primary' | 'success' | 'warning' | 'danger' | 'accent'

type EmailShellOptions = {
  eyebrow: string
  title: string
  intro: string
  tone?: EmailTone
  ctaLabel?: string
  ctaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  content: string
  note?: string
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Cantoni English School <gabriel@cantonies.com.br>'

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://cantonies.com.br').replace(/\/$/, '')
}

function getLogoUrl() {
  return `${getAppUrl()}/logo-cantoni.svg`
}

function getResendClient(): Resend | EmailSender {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 're_123') {
    return {
      emails: {
        send: async () => {
          console.warn('RESEND_API_KEY not set. Skipping email.')
          return { data: null, error: null }
        },
      },
    }
  }

  return new Resend(key)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function getToneStyles(tone: EmailTone) {
  switch (tone) {
    case 'success':
      return {
        accent: '#166534',
        accentSoft: '#dcfce7',
        accentBorder: '#86efac',
        badge: '#14532d',
        button: '#166534',
        surface: '#f6fef9',
      }
    case 'warning':
      return {
        accent: '#b45309',
        accentSoft: '#ffedd5',
        accentBorder: '#fdba74',
        badge: '#9a3412',
        button: '#c2410c',
        surface: '#fffaf5',
      }
    case 'danger':
      return {
        accent: '#b91c1c',
        accentSoft: '#fee2e2',
        accentBorder: '#fca5a5',
        badge: '#991b1b',
        button: '#b91c1c',
        surface: '#fff7f7',
      }
    case 'accent':
      return {
        accent: '#0f766e',
        accentSoft: '#ccfbf1',
        accentBorder: '#99f6e4',
        badge: '#115e59',
        button: '#0f766e',
        surface: '#f4fffd',
      }
    case 'primary':
    default:
      return {
        accent: '#1e3a5f',
        accentSoft: '#dbeafe',
        accentBorder: '#93c5fd',
        badge: '#1d4ed8',
        button: '#1e3a5f',
        surface: '#f8fbff',
      }
  }
}

function card(title: string, body: string) {
  return `
    <div style="background:#ffffff;border:1px solid #dbe4f0;border-radius:18px;padding:20px 18px;margin:16px 0;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">
        ${escapeHtml(title)}
      </p>
      <div style="font-size:14px;line-height:1.7;color:#334155;">
        ${body}
      </div>
    </div>
  `
}

function statGrid(items: Array<{ label: string; value: string }>) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 8px 0;border-collapse:separate;">
      ${items
        .map(
          (item) => `
            <tr>
              <td style="padding:0 0 10px 0;">
                <div style="background:#f8fafc;border:1px solid #dbe4f0;border-radius:16px;padding:16px 18px;">
                  <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">
                    ${escapeHtml(item.label)}
                  </div>
                  <div style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.4;">
                    ${escapeHtml(item.value)}
                  </div>
                </div>
              </td>
            </tr>
          `
        )
        .join('')}
    </table>
  `
}

function bulletList(items: string[]) {
  return `
    <ul style="margin:0;padding-left:18px;color:#334155;">
      ${items.map((item) => `<li style="margin:0 0 8px 0;">${item}</li>`).join('')}
    </ul>
  `
}

function lessonList(aulas: { data: string; link: string }[]) {
  if (!aulas.length) {
    return '<p style="margin:0;color:#64748b;">As aulas serao adicionadas em breve no portal.</p>'
  }

  return `
    <div style="margin-top:8px;">
      ${aulas
        .slice(0, 5)
        .map(
          (aula) => `
            <div style="background:#f8fafc;border:1px solid #dbe4f0;border-radius:16px;padding:14px 16px;margin-bottom:10px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(aula.data)}</div>
              <div style="margin-top:6px;font-size:13px;">
                <a href="${aula.link}" style="color:#2563eb;text-decoration:none;font-weight:700;">Abrir link da aula</a>
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `
}

function BaseLayout({
  eyebrow,
  title,
  intro,
  tone = 'primary',
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  content,
  note,
}: EmailShellOptions) {
  const colors = getToneStyles(tone)
  const logoUrl = getLogoUrl()

  return `
    <div style="margin:0;background:#edf2f7;padding:24px 12px;font-family:'Segoe UI',Arial,sans-serif;color:#334155;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
        <tr>
          <td style="padding-bottom:14px;text-align:center;">
            <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:${colors.accentSoft};border:1px solid ${colors.accentBorder};font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${colors.badge};">
              ${escapeHtml(eyebrow)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="background:${colors.surface};border:1px solid #dbe4f0;border-radius:28px;padding:28px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding-bottom:22px;">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="width:64px;vertical-align:top;padding-right:14px;">
                        <div style="width:64px;height:64px;border-radius:18px;background:#ffffff;border:1px solid #dbe4f0;padding:10px;box-sizing:border-box;">
                          <img src="${logoUrl}" alt="Cantoni English School" style="width:100%;height:auto;display:block;" />
                        </div>
                      </td>
                      <td style="vertical-align:top;">
                        <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${colors.badge};margin-bottom:6px;">
                          Cantoni English School
                        </div>
                        <div style="font-size:15px;line-height:1.6;color:#475569;">
                          Formação em inglês com método, consistência e acompanhamento individual.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:18px;font-size:38px;line-height:1.08;font-weight:800;letter-spacing:-0.03em;color:#0f172a;">
                  ${escapeHtml(title)}
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:22px;font-size:18px;line-height:1.75;color:#475569;">
                  ${intro}
                </td>
              </tr>
              ${
                ctaLabel && ctaHref
                  ?                     `
                    <tr>
                      <td style="padding-bottom:24px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                          <tr>
                            <td>
                              <a href="${ctaHref}" style="display:block;background:${colors.button};color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 20px;border-radius:16px;text-align:center;">
                                ${escapeHtml(ctaLabel)}
                              </a>
                            </td>
                          </tr>
                          ${
                            secondaryLabel && secondaryHref
                              ?                                 `
                                <tr>
                                  <td style="padding-top:12px;text-align:center;">
                                    <a href="${secondaryHref}" style="color:${colors.accent};text-decoration:none;font-size:14px;font-weight:700;">
                                      ${escapeHtml(secondaryLabel)}
                                    </a>
                                  </td>
                                </tr>
                              `
                              : ''
                          }
                        </table>
                      </td>
                    </tr>
                  `
                  : ''
              }
              <tr>
                <td>${content}</td>
              </tr>
              ${
                note
                  ?                     `
                    <tr>
                      <td style="padding-top:20px;">
                        <div style="padding:16px 18px;border-radius:16px;background:#fffaf0;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.7;">
                          ${note}
                        </div>
                      </td>
                    </tr>
                  `
                  : ''
              }
              <tr>
                <td style="padding-top:24px;border-top:1px solid #e2e8f0;">
                  <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:4px;">Cantoni English School</div>
                  <div style="font-size:12px;line-height:1.7;color:#64748b;">
                    Comunicação oficial do ambiente acadêmico.<br />
                    Remetente: ${escapeHtml(FROM)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0 8px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.7;">
            Cantoni English School<br />
            Comunicação institucional com clareza, discrição e padrão profissional.
          </td>
        </tr>
      </table>
    </div>
  `
}

export async function enviarEmailBoasVindas({
  to,
  nomeAluno,
  plano,
  dataInicio,
  dataFim,
  aulas,
  setupPasswordLink,
}: {
  to: string
  nomeAluno: string
  plano: string
  dataInicio: string
  dataFim: string
  aulas: { data: string; link: string }[]
  setupPasswordLink?: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Seja bem-vindo(a) à Cantoni English School',
    html: BaseLayout({
      eyebrow: 'Boas-vindas',
      title: `Olá, ${nomeAluno}!`,
      intro:
        'É um prazer ter você conosco. Seu plano já está ativo, e reunimos abaixo os próximos passos para que sua experiência comece com clareza, organização e tranquilidade.',
      tone: 'primary',
      ctaLabel: setupPasswordLink ? 'Definir minha senha' : undefined,
      ctaHref: setupPasswordLink,
      content: [
        statGrid([
          { label: 'Plano', value: plano || 'Plano personalizado' },
          { label: 'Início', value: dataInicio },
          { label: 'Fim', value: dataFim },
        ]),
        card('Primeiras aulas', lessonList(aulas)),
        card(
          'Orientações importantes',
          bulletList([
            '<strong>Cancelamentos:</strong> devem ser informados com, no mínimo, 2 horas de antecedência.',
            '<strong>Remarcações:</strong> seguem o limite mensal previsto no seu plano.',
            '<strong>Portal:</strong> aulas, materiais e pagamentos permanecem centralizados em um único ambiente.',
          ])
        ),
      ].join(''),
      note:
        'Se houver qualquer dificuldade no primeiro acesso, basta responder este e-mail para receber suporte.',
    }),
  })
}

export async function enviarEmailCobranca({
  to,
  nomeAluno,
  parcela,
  totalParcelas,
  valor,
  vencimento,
  pixCopiaCola,
  pixQrcode,
}: {
  to: string
  nomeAluno: string
  parcela: number
  totalParcelas: number
  valor: number
  vencimento: string
  pixCopiaCola: string
  pixQrcode?: string
}) {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Parcela ${parcela}/${totalParcelas} disponível para pagamento`,
    html: BaseLayout({
      eyebrow: 'Financeiro',
      title: `Olá, ${nomeAluno}!`,
      intro:
        'Segue abaixo a cobrança referente ao seu ciclo de aulas. Para mais agilidade na compensação, o pagamento via PIX é o formato recomendado.',
      tone: 'warning',
      content: [
        statGrid([
          { label: 'Parcela', value: `${parcela}/${totalParcelas}` },
          { label: 'Valor', value: valorFmt },
          { label: 'Vencimento', value: vencimento },
        ]),
        pixQrcode
          ? card(
              'QR Code PIX',
              `<div style="text-align:center;"><img src="${pixQrcode}" alt="QR Code PIX" style="max-width:220px;width:100%;height:auto;border-radius:16px;" /></div>`
            )
          : '',
        card(
          'PIX Copia e Cola',
          `<div style="padding:14px 16px;border-radius:16px;background:#0f172a;color:#e2e8f0;font-family:Consolas,Monaco,monospace;font-size:13px;word-break:break-all;">${escapeHtml(
            pixCopiaCola
          )}</div>`
        ),
      ].join(''),
      note: 'Assim que o pagamento for reconhecido, o portal refletirá a atualização automaticamente.',
    }),
  })
}

export async function enviarConfirmacaoPagamento({
  to,
  nomeAluno,
  parcela,
  totalParcelas,
  valor,
  dataPagamento,
}: {
  to: string
  nomeAluno: string
  parcela: number
  totalParcelas: number
  valor: number
  dataPagamento: string
}) {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Pagamento confirmado da parcela ${parcela}/${totalParcelas}`,
    html: BaseLayout({
      eyebrow: 'Pagamento aprovado',
      title: 'Pagamento confirmado',
      intro: `Tudo certo, ${nomeAluno}. Seu pagamento foi reconhecido e já consta no portal.`,
      tone: 'success',
      content: statGrid([
        { label: 'Parcela', value: `${parcela}/${totalParcelas}` },
        { label: 'Valor', value: valorFmt },
        { label: 'Data', value: dataPagamento },
      ]),
    }),
  })
}

export async function enviarLembreteAula({
  to,
  nomeAluno,
  dataHora,
  meetLink,
  homework,
  has_homework,
  homeworkType,
  homeworkLink,
  homeworkDueDate,
}: {
  to: string
  nomeAluno: string
  dataHora: string
  meetLink: string
  homework?: string
  has_homework?: boolean
  homeworkType?: string
  homeworkLink?: string
  homeworkDueDate?: string
}) {
  const resend = getResendClient()

  let homeworkHtml = card(
    'Tarefa',
    '<p style="margin:0;color:#64748b;">Nenhuma lição de casa foi registrada para esta aula.</p>'
  )

  if (has_homework !== false && homework) {
    homeworkHtml = card(
      'Lição de casa',
      `<p style="margin:0 0 10px 0;">${nl2br(homework)}</p>${
        homeworkDueDate
          ? `<p style="margin:0;font-size:13px;color:#64748b;"><strong>Prazo sugerido:</strong> ${escapeHtml(homeworkDueDate)}</p>`
          : ''
      }${
        homeworkType === 'evolve' && homeworkLink
          ? `<p style="margin:14px 0 0 0;"><a href="${homeworkLink}" style="color:#4f46e5;text-decoration:none;font-weight:700;">Abrir Cambridge One</a></p>`
          : ''
      }`
    )
  }

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Sua próxima aula é amanhã',
    html: BaseLayout({
      eyebrow: 'Lembrete de aula',
      title: `Sua aula está chegando, ${nomeAluno}`,
      intro: 'Abaixo está o horário da sua próxima aula, com acesso rápido para você entrar no encontro com praticidade.',
      tone: 'accent',
      ctaLabel: 'Entrar no Google Meet',
      ctaHref: meetLink,
      content: [
        statGrid([{ label: 'Data e horário', value: dataHora }]),
        homeworkHtml,
      ].join(''),
      note: 'Caso precise cancelar ou remarcar, o ideal é avisar com pelo menos 2 horas de antecedência.',
    }),
  })
}

export async function enviarAulaContabilizadaComoDada({
  to,
  nomeAluno,
  dataHora,
  aulasDadas,
  aulasRestantes,
}: {
  to: string
  nomeAluno: string
  dataHora: string
  aulasDadas: number
  aulasRestantes: number
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Aula contabilizada como dada em ${dataHora}`,
    html: BaseLayout({
      eyebrow: 'Registro de aula',
      title: 'Registro de aula atualizado',
      intro: `Olá, ${nomeAluno}. A aula abaixo já foi registrada em seu histórico acadêmico e o acompanhamento do seu plano foi atualizado no portal.`,
      tone: 'primary',
      content: statGrid([
        { label: 'Data da aula', value: dataHora },
        { label: 'Aulas realizadas', value: String(aulasDadas) },
        { label: 'Aulas restantes', value: String(aulasRestantes) },
      ]),
    }),
  })
}

export async function enviarConfirmacaoRemarcacao({
  to,
  nomeAluno,
  dataAntiga,
  dataNova,
  meetLink,
}: {
  to: string
  nomeAluno: string
  dataAntiga: string
  dataNova: string
  meetLink: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Sua remarcação foi confirmada',
    html: BaseLayout({
      eyebrow: 'Remarcação',
      title: `Tudo certo, ${nomeAluno}`,
      intro: 'Sua aula foi remarcada com sucesso. A nova data abaixo já é a válida no sistema.',
      tone: 'primary',
      ctaLabel: 'Abrir Google Meet',
      ctaHref: meetLink,
      content: statGrid([
        { label: 'Antes', value: dataAntiga },
        { label: 'Nova data', value: dataNova },
      ]),
    }),
  })
}

export async function enviarAlertaPendenciaFinanceira({
  to,
  nomeAluno,
  aulasConcluidas,
  proximosPassos,
}: {
  to: string
  nomeAluno: string
  aulasConcluidas: number
  proximosPassos: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Importante: aulas concluídas e pendência financeira',
    html: BaseLayout({
      eyebrow: 'Atenção financeira',
      title: `Olá, ${nomeAluno}`,
      intro:
        'Seu ciclo atual chegou ao limite de aulas previstas, mas ainda existe uma pendência financeira associada a esse período.',
      tone: 'warning',
      content: [
        statGrid([{ label: 'Aulas concluídas', value: String(aulasConcluidas) }]),
        card('Próximos passos', `<p style="margin:0;">${nl2br(proximosPassos)}</p>`),
      ].join(''),
    }),
  })
}

export async function enviarResumoAulaAI({
  to,
  nomeAluno,
  dataHora,
  resumoMarkdown,
}: {
  to: string
  nomeAluno: string
  dataHora: string
  resumoMarkdown: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Resumo da sua aula - ${dataHora}`,
    html: BaseLayout({
      eyebrow: 'Resumo da aula',
      title: `Hi, ${nomeAluno}!`,
      intro: 'Aqui está o resumo estruturado da sua aula, com os pontos mais relevantes para revisão, continuidade e prática autônoma.',
      tone: 'accent',
      content: [
        statGrid([{ label: 'Aula', value: dataHora }]),
        card(
          'Resumo gerado',
          `<div style="font-size:14px;line-height:1.8;color:#334155;">${nl2br(resumoMarkdown)}</div>`
        ),
      ].join(''),
    }),
  })
}

export async function enviarEmailPrimeiroAcesso({
  to,
  nomeAluno,
  setupPasswordLink,
}: {
  to: string
  nomeAluno: string
  setupPasswordLink: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Primeiro acesso ao portal da Cantoni English School',
    html: BaseLayout({
      eyebrow: 'Primeiro acesso',
      title: `Olá, ${nomeAluno}!`,
      intro:
        'Seu cadastro no portal já está pronto. Agora falta apenas definir sua senha para começar a usar a plataforma com segurança e autonomia.',
      tone: 'primary',
      ctaLabel: 'Definir minha senha',
      ctaHref: setupPasswordLink,
      content: card(
        'Importante',
        bulletList([
          'Depois de definir sua senha, você poderá entrar normalmente com seu e-mail.',
        ])
      ),
    }),
  })
}

export async function enviarEmailRecuperacaoSenha({
  to,
  nomeAluno,
  recoveryLink,
}: {
  to: string
  nomeAluno: string
  recoveryLink: string
}) {
  const resend = getResendClient()

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Recuperação de senha do portal da Cantoni English School',
    html: BaseLayout({
      eyebrow: 'Recuperação de senha',
      title: `Olá, ${nomeAluno}!`,
      intro:
        'Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para criar uma nova senha com segurança.',
      tone: 'primary',
      ctaLabel: 'Redefinir minha senha',
      ctaHref: recoveryLink,
      content: card(
        'Segurança',
        '<p style="margin:0;">Se você não solicitou essa alteração, basta ignorar este e-mail. Nenhuma mudança será aplicada sem a sua confirmação.</p>'
      ),
    }),
  })
}

export function getEmailTemplatePreviews() {
  const appUrl = getAppUrl()
  const meetLink = `${appUrl}/professor`
  const secureLink = `${appUrl}/redefinir-senha`

  return [
    {
      slug: 'boas-vindas',
      name: 'Boas-vindas',
      subject: 'Seja bem-vindo(a) à Cantoni English School',
      html: BaseLayout({
        eyebrow: 'Boas-vindas',
        title: 'Olá, Gabriel!',
        intro:
          'É um prazer ter você conosco. Seu plano já está ativo, e reunimos abaixo os próximos passos para que sua experiência comece com clareza, organização e tranquilidade.',
        tone: 'primary',
        ctaLabel: 'Definir minha senha',
        ctaHref: secureLink,
        content: [
          statGrid([
            { label: 'Plano', value: 'Plano Premium | 2x por semana' },
            { label: 'Início', value: '10/04/2026' },
            { label: 'Fim', value: '10/10/2026' },
          ]),
          card(
            'Primeiras aulas',
            lessonList([
              { data: 'Segunda-feira, 10/04 às 19h00', link: meetLink },
              { data: 'Quarta-feira, 12/04 às 19h00', link: meetLink },
            ])
          ),
          card(
            'Orientações importantes',
            bulletList([
              '<strong>Cancelamentos:</strong> devem ser informados com, no mínimo, 2 horas de antecedência.',
              '<strong>Remarcações:</strong> seguem o limite mensal previsto no seu plano.',
              '<strong>Portal:</strong> aulas, materiais e pagamentos permanecem centralizados em um único ambiente.',
            ])
          ),
        ].join(''),
        note: 'Se houver qualquer dificuldade no primeiro acesso, basta responder este e-mail para receber suporte.',
      }),
    },
    {
      slug: 'cobranca',
      name: 'Cobrança',
      subject: 'Parcela 2/6 disponível para pagamento',
      html: BaseLayout({
        eyebrow: 'Financeiro',
        title: 'Olá, Gabriel!',
        intro:
          'Segue abaixo a cobrança referente ao seu ciclo de aulas. Para mais agilidade na compensação, o pagamento via PIX é o formato recomendado.',
        tone: 'warning',
        content: [
          statGrid([
            { label: 'Parcela', value: '2/6' },
            { label: 'Valor', value: 'R$ 480,00' },
            { label: 'Vencimento', value: '15/04/2026' },
          ]),
          card(
            'PIX Copia e Cola',
            `<div style="padding:14px 16px;border-radius:16px;background:#0f172a;color:#e2e8f0;font-family:Consolas,Monaco,monospace;font-size:13px;word-break:break-all;">00020126580014BR.GOV.BCB.PIX0114+5511999999995204000053039865406480.005802BR5920Cantoni English School6009SAO PAULO62070503***6304ABCD</div>`
          ),
        ].join(''),
        note: 'Assim que o pagamento for reconhecido, o portal refletirá a atualização automaticamente.',
      }),
    },
    {
      slug: 'pagamento-confirmado',
      name: 'Pagamento confirmado',
      subject: 'Pagamento confirmado da parcela 2/6',
      html: BaseLayout({
        eyebrow: 'Pagamento aprovado',
        title: 'Pagamento confirmado',
        intro: 'Tudo certo, Gabriel. Seu pagamento foi reconhecido e já consta no portal.',
        tone: 'success',
        content: statGrid([
          { label: 'Parcela', value: '2/6' },
          { label: 'Valor', value: 'R$ 480,00' },
          { label: 'Data', value: '14/04/2026' },
        ]),
      }),
    },
    {
      slug: 'lembrete-aula',
      name: 'Lembrete de aula',
      subject: 'Sua próxima aula é amanhã',
      html: BaseLayout({
        eyebrow: 'Lembrete de aula',
        title: 'Sua aula está chegando, Gabriel',
        intro:
          'Abaixo está o horário da sua próxima aula, com acesso rápido para você entrar no encontro com praticidade.',
        tone: 'accent',
        ctaLabel: 'Entrar no Google Meet',
        ctaHref: meetLink,
        content: [
          statGrid([{ label: 'Data e horário', value: 'Quarta-feira, 14/04 às 19h00' }]),
          card(
            'Lição de casa',
            `<p style="margin:0 0 10px 0;">Revise o vocabulário da unidade 4 e escreva um pequeno parágrafo usando as novas estruturas.</p>
             <p style="margin:0;font-size:13px;color:#64748b;"><strong>Prazo sugerido:</strong> até a próxima aula</p>`
          ),
        ].join(''),
        note: 'Caso precise cancelar ou remarcar, o ideal é avisar com pelo menos 2 horas de antecedência.',
      }),
    },
    {
      slug: 'aula-contabilizada',
      name: 'Aula contabilizada',
      subject: 'Aula contabilizada como dada em 14/04/2026 às 19h00',
      html: BaseLayout({
        eyebrow: 'Registro de aula',
        title: 'Registro de aula atualizado',
        intro:
          'Olá, Gabriel. A aula abaixo já foi registrada em seu histórico acadêmico e o acompanhamento do seu plano foi atualizado no portal.',
        tone: 'primary',
        content: statGrid([
          { label: 'Data da aula', value: '14/04/2026 às 19h00' },
          { label: 'Aulas realizadas', value: '12' },
          { label: 'Aulas restantes', value: '10' },
        ]),
      }),
    },
    {
      slug: 'remarcacao',
      name: 'Remarcação confirmada',
      subject: 'Sua remarcação foi confirmada',
      html: BaseLayout({
        eyebrow: 'Remarcação',
        title: 'Tudo certo, Gabriel',
        intro: 'Sua aula foi remarcada com sucesso. A nova data abaixo já é a válida no sistema.',
        tone: 'primary',
        ctaLabel: 'Abrir Google Meet',
        ctaHref: meetLink,
        content: statGrid([
          { label: 'Antes', value: '14/04/2026 às 19h00' },
          { label: 'Nova data', value: '15/04/2026 às 18h30' },
        ]),
      }),
    },
    {
      slug: 'pendencia-financeira',
      name: 'Pendência financeira',
      subject: 'Importante: aulas concluídas e pendência financeira',
      html: BaseLayout({
        eyebrow: 'Atenção financeira',
        title: 'Olá, Gabriel',
        intro:
          'Seu ciclo atual chegou ao limite de aulas previstas, mas ainda existe uma pendência financeira associada a esse período.',
        tone: 'warning',
        content: [
          statGrid([{ label: 'Aulas concluídas', value: '24' }]),
          card(
            'Próximos passos',
            `<p style="margin:0;">Regularize a parcela em aberto para manter a agenda e o fluxo pedagógico sem interrupções.</p>`
          ),
        ].join(''),
      }),
    },
    {
      slug: 'resumo-ia',
      name: 'Resumo de aula com IA',
      subject: 'Resumo da sua aula - 14/04/2026 às 19h00',
      html: BaseLayout({
        eyebrow: 'Resumo da aula',
        title: 'Hi, Gabriel!',
        intro:
          'Aqui está o resumo estruturado da sua aula, com os pontos mais relevantes para revisão, continuidade e prática autônoma.',
        tone: 'accent',
        content: [
          statGrid([{ label: 'Aula', value: '14/04/2026 às 19h00' }]),
          card(
            'Resumo gerado',
            nl2br(
              'Topic: Travel routines\nVocabulary: boarding pass, delay, layover\nGrammar: present perfect x simple past\nPractice tip: write 5 sentences about your last trip using both structures.'
            )
          ),
        ].join(''),
      }),
    },
    {
      slug: 'primeiro-acesso',
      name: 'Primeiro acesso',
      subject: 'Primeiro acesso ao portal da Cantoni English School',
      html: BaseLayout({
        eyebrow: 'Primeiro acesso',
        title: 'Olá, Gabriel!',
        intro:
          'Seu cadastro no portal já está pronto. Agora falta apenas definir sua senha para começar a usar a plataforma com segurança e autonomia.',
        tone: 'primary',
        ctaLabel: 'Definir minha senha',
        ctaHref: secureLink,
        content: card(
          'Importante',
          bulletList([
            'Depois de definir sua senha, você poderá entrar normalmente com seu e-mail.',
          ])
        ),
      }),
    },
    {
      slug: 'recuperacao-senha',
      name: 'Recuperação de senha',
      subject: 'Recuperação de senha do portal da Cantoni English School',
      html: BaseLayout({
        eyebrow: 'Recuperação de senha',
        title: 'Olá, Gabriel!',
        intro:
          'Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para criar uma nova senha com segurança.',
        tone: 'primary',
        ctaLabel: 'Redefinir minha senha',
        ctaHref: secureLink,
        content: card(
          'Segurança',
          '<p style="margin:0;">Se você não solicitou essa alteração, basta ignorar este e-mail. Nenhuma mudança será aplicada sem a sua confirmação.</p>'
        ),
      }),
    },
  ]
}
