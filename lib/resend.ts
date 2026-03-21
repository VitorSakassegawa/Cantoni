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

const FROM = process.env.RESEND_FROM_EMAIL || 'Teacher Gabriel <gabecantoni@gmail.com>'


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
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;color:#334155;line-height:1.6">
        <h2 style="color:#1e3a5f;margin-bottom:20px">Olá, ${nomeAluno}! 👋</h2>
        <p>Seja muito bem-vindo(a) às aulas de inglês com <strong>Teacher Gabriel Cantoni</strong>!</p>
        
        <div style="background:#f8fafc;padding:24px;border-radius:16px;margin:24px 0;border:1px solid #e2e8f0">
          <h3 style="margin-top:0;color:#1e3a5f;font-size:16px">🔑 Acesso à Plataforma</h3>
          <p style="font-size:14px">Para acompanhar suas aulas, materiais e pagamentos, defina sua senha no botão abaixo:</p>
          ${setupPasswordLink ? `
          <a href="${setupPasswordLink}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold;margin:10px 0">Definir minha Senha</a>
          ` : ''}
          <p style="font-size:12px;color:#64748b;margin-top:10px">Se o botão não funcionar, use este link: <br/> ${setupPasswordLink}</p>
        </div>

        <h3 style="color:#1e3a5f">📋 Seu Plano</h3>
        <p style="font-size:14px"><strong>${plano}</strong><br/>Período: ${dataInicio} a ${dataFim}</p>
        
        <h3 style="color:#1e3a5f">📅 Primeiras Aulas</h3>
        <ul style="font-size:14px;padding-left:20px">${aulasHtml}</ul>

        <h3 style="color:#1e3a5f">⚠️ Regras Importantes</h3>
        <ul style="font-size:13px;color:#475569">
          <li><strong>Cancelamentos:</strong> Mínimo de 2 horas de antecedência.</li>
          <li><strong>Remarcações:</strong> Respeitam o limite mensal do seu plano.</li>
          <li><strong>Contrato:</strong> Semestral (avisar alterações com 30 dias).</li>
        </ul>

        <p style="margin-top:30px;font-weight:bold">Bons estudos! 🇺🇸</p>
        <hr style="border:none;border-top:1px solid #e2e8f0/50;margin:30px 0" />
        <p style="color:#94a3b8;font-size:11px">Teacher Gabriel Cantoni — Aulas de inglês online</p>
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
  homeworkType,
  homeworkLink,
  homeworkDueDate,
}: {
  to: string
  nomeAluno: string
  dataHora: string
  meetLink: string
  homework?: string
  homeworkType?: string
  homeworkLink?: string
  homeworkDueDate?: string
}) {
  const resend = getResendClient()
  
  let homeworkSection = ''
  if (homework) {
    homeworkSection = `<p><strong>Lição de casa:</strong> ${homework}</p>`
  }

  if (homeworkType === 'evolve' && homeworkLink) {
    homeworkSection += `
      <div style="background:#f5f3ff;padding:16px;border-radius:12px;margin:12px 0;border:1px solid #ddd6fe">
        <p style="margin:0;color:#5b21b6;font-weight:bold;font-size:14px">📚 Cambridge Evolve Workbook</p>
        <p style="margin:8px 0;font-size:13px">Complete os exercícios na plataforma Cambridge One:</p>
        <a href="${homeworkLink}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px">Abrir Cambridge One</a>
        ${homeworkDueDate ? `<p style="margin:10px 0 0 0;font-size:11px;color:#7c3aed;text-transform:uppercase;font-weight:black;letter-spacing:1px">Prazo: ${homeworkDueDate}</p>` : ''}
      </div>
    `
  } else if (homeworkType === 'esl_brains') {
    homeworkSection += `
      <div style="background:#eff6ff;padding:16px;border-radius:12px;margin:12px 0;border:1px solid #dbeafe">
        <p style="margin:0;color:#1e40af;font-weight:bold;font-size:14px">🧠 ESL Brains</p>
        <p style="margin:8px 0;font-size:13px">Após realizar a atividade, não esqueça de <strong>anexar o print</strong> na nossa plataforma!</p>
      </div>
    `
  }

  return resend.emails.send({
    from: FROM,
    to,
    subject: `📚 Sua aula de inglês é amanhã!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#334155">
        <h2 style="color:#1e3a5f">Lembrete de aula 🎓</h2>
        <p>Olá, ${nomeAluno}! Sua aula está chegando:</p>
        <div style="background:#f8fafc;padding:24px;border-radius:16px;margin:24px 0;border:1px solid #e2e8f0 shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)">
          <p style="margin:0;font-size:18px;font-weight:black;color:#0f172a">${dataHora}</p>
          <p style="margin:12px 0 0 0"><a href="${meetLink}" style="display:inline-block;color:#2563eb;font-weight:bold;text-decoration:none">🔗 Entrar no Google Meet</a></p>
        </div>
        
        ${homeworkSection}

        <p style="color:#dc2626;font-size:12px;margin-top:30px;padding:12px;background:#fef2f2;border-radius:8px">
          ⚠️ <strong>Aviso:</strong> Cancelamentos precisam de 2 horas de antecedência.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0" />
        <p style="color:#94a3b8;font-size:11px">Teacher Gabriel Cantoni</p>
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
    subject: '🔔 Importante: Conclusão de aulas e pendência financeira',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#334155;line-height:1.6">
        <h2 style="color:#1e3a5f">Olá, ${nomeAluno}! 👋</h2>
        <p>Gostaríamos de informar que você atingiu o limite de aulas concluídas referente ao seu plano atual.</p>
        
        <div style="background:#fff7ed;padding:24px;border-radius:16px;margin:24px 0;border:1px solid #ffedd5">
          <p style="margin:0;color:#9a3412;font-weight:bold;font-size:16px">📊 Resumo de Aulas</p>
          <p style="font-size:14px;color:#c2410c"><strong>Aulas realizadas: ${aulasConcluidas}</strong></p>
          <hr style="border:none;border-top:1px solid #fed7aa;margin:15px 0" />
          <p style="font-size:14px;margin-bottom:0"><strong>Atenção:</strong> Identificamos que ainda não consta o pagamento da mensalidade/pacote correspondente no nosso sistema.</p>
        </div>

        <h3 style="color:#1e3a5f">💳 Próximos Passos</h3>
        <p style="font-size:14px">${proximosPassos}</p>

        <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;font-size:13px;color:#64748b;border:1px solid #e2e8f0">
          <p style="margin:0">Caso você já tenha realizado o pagamento nas últimas 24h, por favor desconsidere este aviso ou envie o comprovante diretamente para o Teacher Gabriel.</p>
        </div>

        <p style="margin-top:30px;font-weight:bold">Estamos à disposição para qualquer dúvida!</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0" />
        <p style="color:#94a3b8;font-size:11px">Teacher Gabriel Cantoni — Cantoni English</p>
      </div>
    `,
  })
}
