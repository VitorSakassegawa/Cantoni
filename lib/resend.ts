import { Resend } from 'resend'

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 're_123') {
    // Return a dummy object for build time to avoid constructor error
    return {
      emails: {
        send: async () => {
          console.warn('RESEND_API_KEY non set. Skipping email.')
          return { data: null, error: null }
        }
      }
    } as any
  }
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Teacher Gabriel <contato@teachergabriel.com.br>'

export async function enviarEmailBoasVindas({
  to,
  nomeAluno,
  plano,
  dataInicio,
  dataFim,
  aulas,
}: {
  to: string
  nomeAluno: string
  plano: string
  dataInicio: string
  dataFim: string
  aulas: { data: string; link: string }[]
}) {
  const aulasHtml = aulas
    .slice(0, 5)
    .map((a) => `<li>${a.data} — <a href="${a.link}">${a.link}</a></li>`)
    .join('')

  const resend = getResendClient()
  return resend.emails.send({
    from: FROM,
    to,
    subject: '🎉 Bem-vindo(a) às aulas de inglês com Teacher Gabriel!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Olá, ${nomeAluno}! 👋</h2>
        <p>Seja muito bem-vindo(a) às aulas de inglês com <strong>Teacher Gabriel Cantoni</strong>!</p>
        <h3>Seu plano</h3>
        <p>${plano}</p>
        <p><strong>Período:</strong> ${dataInicio} a ${dataFim}</p>
        <h3>Regras importantes</h3>
        <ul>
          <li>Cancelamentos precisam de <strong>2 horas de antecedência</strong>. Sem aviso = aula dada.</li>
          <li>Remarcações respeitam o limite mensal do seu plano.</li>
          <li>Contrato semestral — alterações com 30 dias de antecedência.</li>
        </ul>
        <h3>Primeiras aulas</h3>
        <ul>${aulasHtml}</ul>
        <p>Qualquer dúvida, responda este e-mail. Bons estudos! 🇺🇸</p>
        <p style="color:#666;font-size:12px">Teacher Gabriel Cantoni — Aulas de inglês online via Google Meet</p>
      </div>
    `,
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
    subject: `💰 Parcela ${parcela}/${totalParcelas} — Aulas de Inglês Teacher Gabriel`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Olá, ${nomeAluno}!</h2>
        <p>Segue a cobrança referente à parcela <strong>${parcela}/${totalParcelas}</strong> das suas aulas de inglês.</p>
        <div style="background:#f0f7ff;padding:20px;border-radius:8px;margin:20px 0">
          <p style="margin:0;font-size:24px;font-weight:bold;color:#1e3a5f">${valorFmt}</p>
          <p style="margin:4px 0;color:#666">Vencimento: <strong>${vencimento}</strong></p>
        </div>
        ${pixQrcode ? `<div style="text-align:center;margin:20px 0"><img src="${pixQrcode}" alt="QR Code PIX" style="width:200px;height:200px"/></div>` : ''}
        <h3>Código PIX Copia e Cola</h3>
        <div style="background:#f5f5f5;padding:12px;border-radius:6px;word-break:break-all;font-family:monospace;font-size:13px">
          ${pixCopiaCola}
        </div>
        <p style="margin-top:20px;color:#666;font-size:13px">
          Preferência: <strong>PIX</strong> (gratuito). Cartão disponível com acréscimo de taxa.<br/>
          Dúvidas? Responda este e-mail.
        </p>
      </div>
    `,
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
    subject: `✅ Pagamento confirmado — Parcela ${parcela}/${totalParcelas}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">Pagamento confirmado! ✅</h2>
        <p>Olá, ${nomeAluno}! Seu pagamento foi recebido com sucesso.</p>
        <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0">
          <p style="margin:0"><strong>Parcela:</strong> ${parcela}/${totalParcelas}</p>
          <p style="margin:4px 0"><strong>Valor:</strong> ${valorFmt}</p>
          <p style="margin:4px 0"><strong>Data:</strong> ${dataPagamento}</p>
        </div>
        <p>Bons estudos! 🇺🇸</p>
      </div>
    `,
  })
}

export async function enviarLembreteAula({
  to,
  nomeAluno,
  dataHora,
  meetLink,
  homework,
}: {
  to: string
  nomeAluno: string
  dataHora: string
  meetLink: string
  homework?: string
}) {
  const resend = getResendClient()
  return resend.emails.send({
    from: FROM,
    to,
    subject: `📚 Sua aula de inglês é amanhã!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Lembrete de aula 🎓</h2>
        <p>Olá, ${nomeAluno}! Sua aula está chegando:</p>
        <div style="background:#f0f7ff;padding:20px;border-radius:8px;margin:20px 0">
          <p style="margin:0;font-size:18px"><strong>${dataHora}</strong></p>
          <p style="margin:8px 0"><a href="${meetLink}" style="color:#1e3a5f">🔗 Entrar no Google Meet</a></p>
        </div>
        ${homework ? `<p><strong>Lição de casa pendente:</strong> ${homework}</p>` : ''}
        <p style="color:#dc2626;font-size:13px">⚠️ Cancelamentos precisam de <strong>2 horas de antecedência</strong>. Sem aviso = aula contabilizada como dada.</p>
      </div>
    `,
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
    subject: `⚠️ Aula contabilizada como dada — ${dataHora}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#dc2626">Aula contabilizada como dada</h2>
        <p>Olá, ${nomeAluno}. A aula do dia <strong>${dataHora}</strong> foi contabilizada como dada pois não houve cancelamento com ao menos 2 horas de antecedência.</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px">
          <p style="margin:0"><strong>Aulas realizadas:</strong> ${aulasDadas}</p>
          <p style="margin:4px 0"><strong>Aulas restantes:</strong> ${aulasRestantes}</p>
        </div>
        <p style="font-size:13px;color:#666">Dúvidas? Responda este e-mail.</p>
      </div>
    `,
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
    subject: `🔄 Aula remarcada com sucesso`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Remarcação confirmada ✅</h2>
        <p>Olá, ${nomeAluno}! Sua aula foi remarcada:</p>
        <div style="background:#f0f7ff;padding:20px;border-radius:8px">
          <p style="margin:0;color:#666;text-decoration:line-through">Antes: ${dataAntiga}</p>
          <p style="margin:8px 0;font-size:18px"><strong>Nova data: ${dataNova}</strong></p>
          <p style="margin:0"><a href="${meetLink}">🔗 Link do Google Meet</a></p>
        </div>
      </div>
    `,
  })
}
