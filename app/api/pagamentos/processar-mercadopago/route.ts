import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  assertPaymentAmountMatches,
  mapMercadoPagoStatus,
  normalizePaymentAmount,
  splitFullName,
} from '@/lib/payments'

function getAlunoProfile(localPayment: any) {
  const contrato = localPayment?.contrato
  const aluno = contrato?.aluno

  if (Array.isArray(aluno)) {
    return aluno[0]
  }

  return aluno
}

export async function POST(req: NextRequest) {
  try {
    const { formData, paymentId } = await req.json()
    const supabase = await createClient()

    const { data: localPayment, error: fetchErr } = await supabase
      .from('pagamentos')
      .select('*, contrato:contratos(aluno:profiles(email, full_name))')
      .eq('id', paymentId)
      .single()

    if (fetchErr || !localPayment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    if (localPayment.status === 'pago') {
      return NextResponse.json({ error: 'Pagamento já foi liquidado' }, { status: 409 })
    }

    const aluno = getAlunoProfile(localPayment)
    const amount = normalizePaymentAmount(localPayment.valor)
    const { firstName, lastName } = splitFullName(aluno?.full_name || '')

    const body = {
      ...formData,
      transaction_amount: amount,
      external_reference: paymentId.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      payer: {
        ...(typeof formData?.payer === 'object' && formData.payer ? formData.payer : {}),
        email: aluno?.email || formData?.payer?.email || '',
        first_name: firstName || formData?.payer?.first_name || '',
        last_name: lastName || formData?.payer?.last_name || '',
      },
    }

    const mpResponse = await payment.create({ body })
    assertPaymentAmountMatches(amount, mpResponse.transaction_amount ?? body.transaction_amount)

    const localStatus = mapMercadoPagoStatus(mpResponse.status)
    const serviceSupabase = await createServiceClient()
    const { error: updateErr } = await serviceSupabase
      .from('pagamentos')
      .update({
        mercadopago_id: mpResponse.id?.toString(),
        mercadopago_status: mpResponse.status,
        mercadopago_payment_method: mpResponse.payment_method_id,
        status: localStatus,
        data_pagamento: localStatus === 'pago' ? new Date().toISOString().split('T')[0] : null,
        pix_qrcode_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64
          ? `data:image/png;base64,${mpResponse.point_of_interaction.transaction_data.qr_code_base64}`
          : null,
        pix_copia_cola: mpResponse.point_of_interaction?.transaction_data?.qr_code || null,
      })
      .eq('id', paymentId)

    if (updateErr) {
      console.error('Update local payment error after MP processing:', updateErr)
      return NextResponse.json(
        { error: 'Falha ao persistir o pagamento localmente' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      point_of_interaction: mpResponse.point_of_interaction,
    })
  } catch (error: any) {
    console.error('Mercado Pago API error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Erro interno ao processar pagamento com Mercado Pago',
      },
      { status: 500 }
    )
  }
}
