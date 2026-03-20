import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const topic = searchParams.get('topic') || req.headers.get('x-mp-topic')
    const body = await req.json()

    // Mercado Pago notification can come as query params or body
    const resourceId = body.data?.id || searchParams.get('id')
    const action = body.action || topic

    if (action === 'payment.updated' || action === 'payment.created' || topic === 'payment') {
      if (!resourceId) return NextResponse.json({ error: 'No ID provided' }, { status: 400 })

      // 1. Fetch payment details from Mercado Pago
      const mpPayment = await payment.get({ id: resourceId })
      const status = mpPayment.status
      const externalReference = mpPayment.external_reference // This should be our local paymentId

      if (externalReference) {
        const supabase = await createServiceClient()

        // 2. Update local database
        const { error: updateErr } = await supabase
          .from('pagamentos')
          .update({
            // @ts-ignore
            mercadopago_status: status,
            status: status === 'approved' ? 'pago' : 'pendente',
            data_pagamento: status === 'approved' ? new Date().toISOString().split('T')[0] : null
          })
          .eq('id', externalReference)

        if (updateErr) {
          console.error('Webhook: Update local payment error:', updateErr)
        } else {
          console.log(`Webhook: Payment ${externalReference} updated to ${status}`)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
