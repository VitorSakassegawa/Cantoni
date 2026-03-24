import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createServiceClient } from '@/lib/supabase/server'
import { validateMPSignature } from '@/lib/mercadopago-auth'
import { ContractService } from '@/lib/services/contract-service'
import { assertPaymentAmountMatches, mapMercadoPagoStatus } from '@/lib/payments'
import { getEnv } from '@/lib/env'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active. Use POST for notifications.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { MERCADOPAGO_WEBHOOK_SECRET: webhookSecret } = getEnv()
    const { searchParams } = new URL(req.url)
    const topic = searchParams.get('topic') || req.headers.get('x-mp-topic')
    const xSignature = req.headers.get('x-signature')
    const body = await req.json()
    const resourceId = body.data?.id || searchParams.get('id')
    const action = body.action || topic

    if (!webhookSecret || !xSignature || !resourceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!validateMPSignature(xSignature, resourceId, webhookSecret)) {
      console.error('Webhook: Invalid signature detected')
      return NextResponse.json({ error: 'Forbidden: Invalid Signature' }, { status: 403 })
    }

    if (action === 'payment.updated' || action === 'payment.created' || topic === 'payment') {
      const mpPayment = await payment.get({ id: resourceId })
      const externalReference = mpPayment.external_reference

      if (!externalReference) {
        return NextResponse.json({ received: true })
      }

      const supabase = await createServiceClient()
      const { data: localPayment, error: paymentError } = await supabase
        .from('pagamentos')
        .select('id, contrato_id, valor')
        .eq('id', externalReference)
        .single()

      if (paymentError || !localPayment) {
        return NextResponse.json({ error: 'Pagamento local não encontrado' }, { status: 404 })
      }

      assertPaymentAmountMatches(localPayment.valor, mpPayment.transaction_amount)

      const localStatus = mapMercadoPagoStatus(mpPayment.status)
      const { error: updateErr } = await supabase
        .from('pagamentos')
        .update({
          mercadopago_status: mpPayment.status,
          status: localStatus,
          data_pagamento: localStatus === 'pago' ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', externalReference)

      if (updateErr) {
        console.error('Webhook: Update local payment error:', updateErr)
        return NextResponse.json({ error: 'Payment update failed' }, { status: 500 })
      }

      if (localStatus === 'pago' && localPayment.contrato_id) {
        await ContractService.syncFinancialStatus(localPayment.contrato_id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
