import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { payment } from '@/lib/mercadopago'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  assertPaymentAmountMatches,
  classifyMercadoPagoStatus,
  normalizePaymentAmount,
  resolveLocalPaymentStatus,
  splitFullName,
} from '@/lib/payments'
import { logActivityBestEffort } from '@/lib/activity-log'
import { resolveCpf } from '@/lib/cpf-security'
import { enviarEmailCobranca } from '@/lib/resend'

type StudentProfile = {
  id?: string
  email?: string | null
  full_name?: string | null
  cpf?: string | null
  cpf_encrypted?: string | null
}

type LocalPaymentRecord = {
  id: number
  contrato_id: number
  parcela_num?: number | null
  valor: number
  status: string | null
  data_vencimento?: string | null
  data_pagamento?: string | null
  mercadopago_id?: string | null
  mercadopago_status?: string | null
  mercadopago_payment_method?: string | null
  pix_qrcode_base64?: string | null
  pix_copia_cola?: string | null
  contrato?: {
    aluno?: StudentProfile | StudentProfile[] | null
  } | null
}

type RequestPayload = {
  formData?: {
    payment_method_id?: string
    paymentMethodId?: string
    payer?: {
      email?: string
      first_name?: string
      last_name?: string
      identification?: {
        number?: string
      }
    }
    [key: string]: unknown
  }
  paymentId: number | string
  selectedPaymentMethod?: string | null
}

function getAlunoProfile(localPayment: LocalPaymentRecord) {
  const contrato = localPayment.contrato
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

function formatDateForEmail(value: string | null | undefined) {
  if (!value) {
    return 'A definir'
  }

  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('pt-BR')
}

async function hasPaymentEmailLog(
  serviceSupabase: Awaited<ReturnType<typeof createServiceClient>>,
  paymentId: number,
  eventType: string
) {
  const { count } = await serviceSupabase
    .from('activity_logs')
    .select('id', { head: true, count: 'exact' })
    .eq('payment_id', paymentId)
    .eq('event_type', eventType)

  return (count || 0) > 0
}

function isMercadoPagoTestMode() {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('TEST-')
}

function buildMercadoPagoIdempotencyKey(input: {
  paymentId: number
  paymentMethodId: string | null
  amount: number
  previousMercadoPagoId?: string | null
}) {
  const fingerprint = [
    input.paymentId,
    input.paymentMethodId || 'unknown',
    input.amount.toFixed(2),
    input.previousMercadoPagoId || 'initial',
  ].join(':')

  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

function getMercadoPagoErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : ''

  const errorCode =
    typeof error === 'object' && error && 'error' in error
      ? String((error as { error?: unknown }).error || '')
      : ''

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
    const { formData, paymentId, selectedPaymentMethod } = (await req.json()) as RequestPayload
    const supabase = await createClient()

    const { data: localPayment, error: fetchErr } = await supabase
      .from('pagamentos')
      .select('*, contrato:contratos(aluno:profiles(id, email, full_name, cpf, cpf_encrypted))')
      .eq('id', paymentId)
      .single()

    if (fetchErr || !localPayment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    const typedLocalPayment = localPayment as LocalPaymentRecord

    if (typedLocalPayment.status === 'pago') {
      return NextResponse.json({ error: 'Pagamento já foi liquidado' }, { status: 409 })
    }

    const aluno = getAlunoProfile(typedLocalPayment)
    const amount = normalizePaymentAmount(typedLocalPayment.valor)
    const numericPaymentId = Number(paymentId)
    const { firstName, lastName } = splitFullName(aluno?.full_name || '')
    const paymentMethodId =
      formData?.payment_method_id || formData?.paymentMethodId || selectedPaymentMethod || null
    const identificationNumber =
      normalizeCpf(formData?.payer?.identification?.number) || normalizeCpf(resolveCpf(aluno))

    const currentAttemptState = classifyMercadoPagoStatus(typedLocalPayment.mercadopago_status)
    const hasOpenPixAlready =
      paymentMethodId === 'pix' &&
      typedLocalPayment.mercadopago_id &&
      currentAttemptState === 'pending' &&
      (typedLocalPayment.pix_copia_cola || typedLocalPayment.pix_qrcode_base64)

    if (hasOpenPixAlready) {
      return NextResponse.json({
        id: typedLocalPayment.mercadopago_id,
        status: typedLocalPayment.mercadopago_status,
        status_detail: 'pending_waiting_transfer',
        reused_existing_pix: true,
        point_of_interaction: {
          transaction_data: {
            qr_code: typedLocalPayment.pix_copia_cola,
            qr_code_base64:
              typedLocalPayment.pix_qrcode_base64?.replace(/^data:image\/png;base64,/, '') ||
              null,
          },
        },
      })
    }

    const hasOpenAttemptAlready =
      paymentMethodId !== 'pix' &&
      typedLocalPayment.mercadopago_id &&
      currentAttemptState === 'pending' &&
      typedLocalPayment.mercadopago_payment_method === paymentMethodId

    if (hasOpenAttemptAlready) {
      return NextResponse.json({
        id: typedLocalPayment.mercadopago_id,
        status: typedLocalPayment.mercadopago_status,
        reused_existing_attempt: true,
      })
    }

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
      external_reference: String(paymentId),
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
        idempotencyKey: buildMercadoPagoIdempotencyKey({
          paymentId: numericPaymentId,
          paymentMethodId,
          amount,
          previousMercadoPagoId:
            currentAttemptState === 'pending' ? null : typedLocalPayment.mercadopago_id,
        }),
      },
    })

    assertPaymentAmountMatches(amount, mpResponse.transaction_amount ?? body.transaction_amount)

    const localStatus = resolveLocalPaymentStatus({
      mercadoPagoStatus: mpResponse.status,
      currentStatus: typedLocalPayment.status,
      dueDate: typedLocalPayment.data_vencimento,
      paidAt: typedLocalPayment.data_pagamento,
    })

    const serviceSupabase = await createServiceClient()
    const pixQrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64
      ? `data:image/png;base64,${mpResponse.point_of_interaction.transaction_data.qr_code_base64}`
      : null
    const pixCopiaCola = mpResponse.point_of_interaction?.transaction_data?.qr_code || null

    const { error: updateErr } = await serviceSupabase
      .from('pagamentos')
      .update({
        mercadopago_id: mpResponse.id?.toString(),
        mercadopago_status: mpResponse.status,
        mercadopago_payment_method: mpResponse.payment_method_id,
        status: localStatus,
        data_pagamento: localStatus === 'pago' ? new Date().toISOString().split('T')[0] : null,
        pix_qrcode_base64: pixQrCodeBase64,
        pix_copia_cola: pixCopiaCola,
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
      contractId: typedLocalPayment.contrato_id,
      paymentId: numericPaymentId,
      eventType: 'payment.processed',
      title: 'Pagamento processado via Mercado Pago',
      description: `Pagamento ${numericPaymentId} processado com status ${mpResponse.status}.`,
      severity: localStatus === 'pago' ? 'success' : 'info',
      metadata: {
        mercadopagoId: mpResponse.id,
        paymentMethod: mpResponse.payment_method_id,
      },
    })

    const shouldSendBillingEmail =
      paymentMethodId === 'pix' &&
      Boolean(aluno?.email) &&
      Boolean(pixCopiaCola) &&
      !(await hasPaymentEmailLog(serviceSupabase, numericPaymentId, 'payment.billing_email_sent'))

    if (shouldSendBillingEmail) {
      const { count: totalParcelasCount } = await serviceSupabase
        .from('pagamentos')
        .select('id', { head: true, count: 'exact' })
        .eq('contrato_id', typedLocalPayment.contrato_id)

      try {
        const emailResult = (await enviarEmailCobranca({
          to: aluno?.email || '',
          nomeAluno: aluno?.full_name || 'Aluno',
          parcela: typedLocalPayment.parcela_num || 1,
          totalParcelas: totalParcelasCount || typedLocalPayment.parcela_num || 1,
          valor: amount,
          vencimento: formatDateForEmail(typedLocalPayment.data_vencimento),
          pixCopiaCola: pixCopiaCola || '',
          pixQrcode: pixQrCodeBase64 || undefined,
        })) as { error?: { message?: string } | null } | null

        if (emailResult?.error) {
          await logActivityBestEffort({
            targetUserId: aluno?.id,
            contractId: typedLocalPayment.contrato_id,
            paymentId: numericPaymentId,
            eventType: 'payment.billing_email_failed',
            title: 'Falha ao enviar e-mail de cobrança',
            description: `A cobrança do pagamento ${numericPaymentId} foi gerada, mas o e-mail não pôde ser entregue.`,
            severity: 'warning',
            metadata: {
              message: emailResult.error.message || null,
            },
          })
        } else {
          await logActivityBestEffort({
            targetUserId: aluno?.id,
            contractId: typedLocalPayment.contrato_id,
            paymentId: numericPaymentId,
            eventType: 'payment.billing_email_sent',
            title: 'E-mail de cobrança enviado',
            description: `A cobrança do pagamento ${numericPaymentId} foi enviada por e-mail.`,
            severity: 'success',
            metadata: {
              paymentMethod: paymentMethodId,
            },
          })
        }
      } catch (error) {
        console.error('Billing email error:', error)
        await logActivityBestEffort({
          targetUserId: aluno?.id,
          contractId: typedLocalPayment.contrato_id,
          paymentId: numericPaymentId,
          eventType: 'payment.billing_email_failed',
          title: 'Falha ao enviar e-mail de cobrança',
          description: `A cobrança do pagamento ${numericPaymentId} foi gerada, mas o e-mail falhou durante o envio.`,
          severity: 'warning',
          metadata: {
            message: error instanceof Error ? error.message : 'unknown_error',
          },
        })
      }
    }

    return NextResponse.json({
      id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      local_status: localStatus,
      generated_pix:
        Boolean(pixCopiaCola) || Boolean(pixQrCodeBase64),
      point_of_interaction: mpResponse.point_of_interaction,
    })
  } catch (error) {
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
