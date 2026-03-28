import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createServiceClient } from '@/lib/supabase/server'
import { validateMPSignature } from '@/lib/mercadopago-auth'
import { ContractService } from '@/lib/services/contract-service'
import {
  assertPaymentAmountMatches,
  classifyMercadoPagoStatus,
  resolveLocalPaymentStatus,
} from '@/lib/payments'
import { getEnv } from '@/lib/env'
import { logActivityBestEffort } from '@/lib/activity-log'

type WebhookLocalPaymentRecord = {
  id: number
  contrato_id: number | null
  valor: number
  status: string | null
  data_vencimento?: string | null
  data_pagamento?: string | null
  mercadopago_status?: string | null
  contrato?: {
    aluno_id?: string | null
  } | null
}

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
    const xRequestId = req.headers.get('x-request-id')
    const body = (await req.json()) as { action?: string; data?: { id?: string } }
    const resourceId = body.data?.id || searchParams.get('id')
    const action = body.action || topic

    if (!webhookSecret || !xSignature || !resourceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!validateMPSignature(xSignature, resourceId, webhookSecret, xRequestId)) {
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
        .select(
          'id, contrato_id, valor, status, data_vencimento, data_pagamento, mercadopago_status, contrato:contratos(aluno_id)'
        )
        .eq('id', externalReference)
        .single()

      if (paymentError || !localPayment) {
        return NextResponse.json({ error: 'Pagamento local não encontrado' }, { status: 404 })
      }

      const typedLocalPayment = localPayment as WebhookLocalPaymentRecord

      assertPaymentAmountMatches(typedLocalPayment.valor, mpPayment.transaction_amount)

      const localStatus = resolveLocalPaymentStatus({
        mercadoPagoStatus: mpPayment.status,
        currentStatus: typedLocalPayment.status,
        dueDate: typedLocalPayment.data_vencimento,
        paidAt:
          classifyMercadoPagoStatus(mpPayment.status) === 'approved'
            ? new Date().toISOString().split('T')[0]
            : null,
      })

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

      if (typedLocalPayment.contrato_id) {
        await ContractService.syncFinancialStatus(String(typedLocalPayment.contrato_id))
      }

      await logActivityBestEffort({
        targetUserId: typedLocalPayment.contrato?.aluno_id,
        contractId: typedLocalPayment.contrato_id,
        paymentId: typedLocalPayment.id,
        eventType: 'payment.webhook_synced',
        title: 'Pagamento conciliado pelo webhook',
        description: `O webhook confirmou o pagamento ${typedLocalPayment.id} com status ${mpPayment.status}.`,
        severity: localStatus === 'pago' ? 'success' : 'info',
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Mercado Pago Webhook Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
