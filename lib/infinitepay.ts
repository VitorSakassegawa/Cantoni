const BASE_URL = 'https://api.infinitepay.io/v2'

async function ipFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INFINITEPAY_API_KEY}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`InfinitePay API error ${res.status}: ${err}`)
  }
  return res.json()
}

export async function criarCobrancaPix({
  amount,
  description,
  customerName,
  customerEmail,
  customerDocument,
  dueDate,
  externalId,
}: {
  amount: number // em centavos
  description: string
  customerName: string
  customerEmail: string
  customerDocument?: string
  dueDate: string // YYYY-MM-DD
  externalId: string
}) {
  const data = await ipFetch('/charges', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      description,
      due_date: dueDate,
      external_id: externalId,
      payment_methods: ['pix'],
      customer: {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
      },
    }),
  })

  return {
    invoiceId: data.id as string,
    pixCopiaCola: data.pix?.emv as string,
    pixQrcodeUrl: data.pix?.qr_code_url as string,
    pixQrcodeBase64: data.pix?.qr_code as string,
    status: data.status as string,
  }
}

export async function consultarCobranca(invoiceId: string) {
  return ipFetch(`/charges/${invoiceId}`)
}

export function validarWebhookInfinitePay(
  payload: string,
  signature: string
): boolean {
  // InfinitePay sends HMAC-SHA256 signature
  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha256', process.env.INFINITEPAY_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')
  return expected === signature
}
