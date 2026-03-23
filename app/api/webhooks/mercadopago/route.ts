import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createServiceClient } from '@/lib/supabase/server'
import { validateMPSignature } from '@/lib/mercadopago-auth'
import { ContractService } from '@/lib/services/contract-service'

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint is active. Use POST for notifications.' })
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const topic = searchParams.get('topic') || req.headers.get('x-mp-topic')
    const xSignature = req.headers.get('x-signature')
    const body = await req.json()

    // Mercado Pago notification can come as query params or body
    const resourceId = body.data?.id || searchParams.get('id')
    const action = body.action || topic

    // SECURITY: Validate Signature if secret is provided
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (webhookSecret && xSignature && resourceId) {
      const isValid = validateMPSignature(xSignature, resourceId, webhookSecret)
      if (!isValid) {
        console.error('Webhook: Invalid Signature detected!')
        return NextResponse.json({ error: 'Forbidden: Invalid Signature' }, { status: 403 })
      }
    }

    if (action === 'payment.updated' || action === 'payment.created' || topic === 'payment') {
      if (!resourceId) return NextResponse.json({ error: 'No ID provided' }, { status: 400 })

      // 1. Fetch payment details from Mercado Pago
      const mpPayment = await payment.get({ id: resourceId })
      const status = mpPayment.status
      const externalReference = mpPayment.external_reference // This should be our local paymentId

      if (externalReference) {
        const supabase = await createServiceClient()

        // 2. Update local database with mapped status
        let localStatus = 'pendente'
        if (status === 'approved' || status === 'authorized') {
          localStatus = 'pago'
        } else if (status === 'rejected' || status === 'cancelled') {
          // We could keep it as pendente or mark as a specific state if needed
          localStatus = 'pendente' 
        }

        const { error: updateErr } = await supabase
          .from('pagamentos')
          .update({
            mercadopago_status: status,
            status: localStatus,
            data_pagamento: localStatus === 'pago' ? new Date().toISOString().split('T')[0] : null
          })
          .eq('id', externalReference)

        if (updateErr) {
          console.error('Webhook: Update local payment error:', updateErr)
        } else {
          console.log(`Webhook: Payment ${externalReference} updated to ${status}`)
          
          // Sync contract status if payment was approved
          if (localStatus === 'pago') {
            const { data: paymentRecord } = await supabase
              .from('pagamentos')
              .select('contrato_id')
              .eq('id', externalReference)
              .single()
            
            if (paymentRecord?.contrato_id) {
              await ContractService.syncFinancialStatus(paymentRecord.contrato_id)
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
