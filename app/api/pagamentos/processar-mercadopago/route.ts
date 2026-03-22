import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { formData, paymentId } = await req.json()
    const supabase = await createClient()

    // 1. Get local payment info to ensure consistency
    const { data: localPayment, error: fetchErr } = await supabase
      .from('pagamentos')
      .select('*, contrato:contratos(aluno:profiles(email, full_name))')
      .eq('id', paymentId)
      .single()

    if (fetchErr || !localPayment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // 2. Prepare Mercado Pago request
    // formData comes directly from the Payment Brick onSubmit callback
    const body = {
      ...formData,
      external_reference: paymentId.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago?source_news=webhooks`,
    }

    // 3. Create payment in MP
    const mpResponse = await payment.create({ body })

    // 4. Update local database
    // We use createServiceClient here because anonymous users don't have UPDATE permissions on pagamentos
    const serviceSupabase = await createServiceClient()
    const { error: updateErr } = await serviceSupabase
      .from('pagamentos')
      .update({
        mercadopago_id: mpResponse.id?.toString(),
        mercadopago_status: mpResponse.status,
        mercadopago_payment_method: mpResponse.payment_method_id,
        status: mpResponse.status === 'approved' ? 'pago' : 'pendente',
        data_pagamento: mpResponse.status === 'approved' ? new Date().toISOString().split('T')[0] : null,
        // If it's PIX, store the QR code/copy-paste info
        pix_qrcode_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        pix_copia_cola: mpResponse.point_of_interaction?.transaction_data?.qr_code || null
      })
      .eq('id', paymentId)

    if (updateErr) {
      console.error('Update local payment error after MP processing:', updateErr)
    }

    return NextResponse.json({
      id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      point_of_interaction: mpResponse.point_of_interaction
    })
  } catch (error: any) {
    console.error('Mercado Pago API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno ao processar pagamento com Mercado Pago' 
    }, { status: 500 })
  }
}
