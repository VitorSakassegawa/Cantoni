import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  assertPaymentAmountMatches,
  mapMercadoPagoStatus,
  normalizePaymentAmount,
  splitFullName,
} from '@/lib/payments'
import { logActivityBestEffort } from '@/lib/activity-log'

function getAlunoProfile(localPayment: any) {
  const contrato = localPayment?.contrato
  const aluno = contrato?.aluno

  if (Array.isArray(aluno)) {
    return aluno[0]
  }

  return aluno
}

function normalizeCpf(value: string | null | undefined) {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

function isMercadoPagoTestMode() {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('TEST-')
}

function getMercadoPagoErrorMessage(error: any) {
  const message = error?.message || ''
  const errorCode = error?.error || ''

  if (
    isMercadoPagoTestMode() &&
    (message.includes('staging-mp-ti-api') ||
      message.includes('circuit breaker open') ||
      errorCode === 'internal_server_error')
  ) {
    return {
      status: 502,
      message:
        'O ambiente de testes do Mercado Pago para PIX está instável no momento. Tente novamente em alguns minutos ou use credenciais de produção para validar o fluxo real.',
    }
  }

  return {
    status: 500,
    message: message || 'Erro interno ao processar pagamento com Mercado Pago',
  }
}

export async function POST(req: NextRequest) {
  try {
    const { formData, paymentId, selectedPaymentMethod } = await req.json()
    const supabase = await createClient()

    const { data: localPayment, error: fetchErr } = await supabase
      .from('pagamentos')
      .select('*, contrato:contratos(aluno:profiles(id, email, full_name, cpf))')
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
    const paymentMethodId =
      formData?.payment_method_id ||
      formData?.paymentMethodId ||
      selectedPaymentMethod ||
      null
    const identificationNumber =
      normalizeCpf(formData?.payer?.identification?.number) || normalizeCpf(aluno?.cpf)

    if (paymentMethodId === 'pix' && !identificationNumber) {
      return NextResponse.json(
        {
          error: 'Para pagamentos via PIX, o CPF do aluno precisa estar preenchido no cadastro.',
        },
        { status: 400 }
      )
    }

    const body = {
      ...formData,
      transaction_amount: amount,
      external_reference: paymentId.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      payment_method_id: paymentMethodId || formData?.payment_method_id,
      payer: {
        ...(typeof formData?.payer === 'object' && formData.payer ? formData.payer : {}),
        email: aluno?.email || formData?.payer?.email || '',
        first_name: firstName || formData?.payer?.first_name || '',
        last_name: lastName || formData?.payer?.last_name || '',
        identification: identificationNumber
          ? {
              type: 'CPF',
              number: identificationNumber,
            }
          : formData?.payer?.identification,
      },
    }

    const mpResponse = await payment.create({
      body,
      requestOptions: {
        idempotencyKey: crypto.randomUUID(),
      },
    })
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

    await logActivityBestEffort({
      targetUserId: aluno?.id,
      contractId: localPayment.contrato_id,
      paymentId,
      eventType: 'payment.processed',
      title: 'Pagamento processado via Mercado Pago',
      description: `Pagamento ${paymentId} processado com status ${mpResponse.status}.`,
      severity: localStatus === 'pago' ? 'success' : 'info',
      metadata: {
        mercadopagoId: mpResponse.id,
        paymentMethod: mpResponse.payment_method_id,
      },
    })

    return NextResponse.json({
      id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      point_of_interaction: mpResponse.point_of_interaction,
    })
  } catch (error: any) {
    console.error('Mercado Pago API error:', error)
    const normalizedError = getMercadoPagoErrorMessage(error)
    return NextResponse.json(
      {
        error: normalizedError.message,
      },
      { status: normalizedError.status }
    )
  }
}
