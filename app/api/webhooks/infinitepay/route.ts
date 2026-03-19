import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validarWebhookInfinitePay } from '@/lib/infinitepay'
import { enviarConfirmacaoPagamento } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('x-infinitepay-signature') || ''

  if (!validarWebhookInfinitePay(payload, signature)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  const event = JSON.parse(payload)

  if (event.type !== 'charge.paid') {
    return NextResponse.json({ received: true })
  }

  const supabase = await createServiceClient()
  const invoiceId = event.data?.id

  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('*, contratos(aluno_id, profiles(full_name, email))')
    .eq('infinitepay_invoice_id', invoiceId)
    .single()

  if (!pagamento) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }

  await supabase
    .from('pagamentos')
    .update({
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
      forma: event.data?.payment_method || 'pix',
    })
    .eq('id', pagamento.id)

  // Send confirmation email
  const contrato = pagamento.contratos as any
  if (contrato?.profiles) {
    await enviarConfirmacaoPagamento({
      to: contrato.profiles.email,
      nomeAluno: contrato.profiles.full_name,
      parcela: pagamento.parcela_num,
      totalParcelas: 6,
      valor: pagamento.valor,
      dataPagamento: new Date().toLocaleDateString('pt-BR'),
    })
  }

  return NextResponse.json({ received: true })
}
