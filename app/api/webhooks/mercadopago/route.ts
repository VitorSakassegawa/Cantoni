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
import { enviarConfirmacaoPagamento } from '@/lib/resend'

type WebhookLocalPaymentRecord = {
  id: number
  contrato_id: number | null
  parcela_num?: number | null
  valor: number
  status: string | null
  data_vencimento?: string | null
  data_pagamento?: string | null
  mercadopago_status?: string | null
  contrato?: {
    aluno_id?: string | null
    aluno?: {
      id?: string
      email?: string | null
      full_name?: string | null
    } | {
      id?: string
      email?: string | null
      full_name?: string | null
    }[] | null
  } | null
}

type ActivityLogMetadata = {
  mercadoPagoStatus?: string | null
  localStatus?: string | null
}

function getAlunoProfile(localPayment: WebhookLocalPaymentRecord) {
  const aluno = localPayment.contrato?.aluno

  if (Array.isArray(aluno)) {
    return aluno[0]
  }

  return aluno
}

function formatDateForEmail(value: string | null | undefined) {
  if (!value) {
    return new Date().toLocaleDateString('pt-BR')
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
    const resourceId =
      searchParams.get('data.id') ||
      searchParams.get('id') ||
      body.data?.id
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
          'id, contrato_id, parcela_num, valor, status, data_vencimento, data_pagamento, mercadopago_status, contrato:contratos(aluno_id, aluno:profiles(id, email, full_name))'
        )
        .eq('id', externalReference)
        .single()

      if (paymentError || !localPayment) {
        return NextResponse.json({ error: 'Pagamento local não encontrado' }, { status: 404 })
      }

      const typedLocalPayment = localPayment as WebhookLocalPaymentRecord
      const aluno = getAlunoProfile(typedLocalPayment)

      assertPaymentAmountMatches(typedLocalPayment.valor, mpPayment.transaction_amount)

      const previousResolvedStatus = resolveLocalPaymentStatus({
        mercadoPagoStatus: typedLocalPayment.mercadopago_status,
        currentStatus: typedLocalPayment.status,
        dueDate: typedLocalPayment.data_vencimento,
        paidAt: typedLocalPayment.data_pagamento,
      })

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

      const webhookMeaningfullyChanged =
        typedLocalPayment.mercadopago_status !== mpPayment.status ||
        previousResolvedStatus !== localStatus

      if (webhookMeaningfullyChanged) {
        const { data: latestActivity } = await supabase
          .from('activity_logs')
          .select('metadata')
          .eq('payment_id', typedLocalPayment.id)
          .eq('event_type', 'payment.webhook_synced')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const latestMetadata = (latestActivity?.metadata || null) as ActivityLogMetadata | null
        const alreadyLoggedCurrentStatus =
          latestMetadata?.mercadoPagoStatus === mpPayment.status &&
          latestMetadata?.localStatus === localStatus

        if (!alreadyLoggedCurrentStatus) {
          await logActivityBestEffort({
            targetUserId: typedLocalPayment.contrato?.aluno_id,
            contractId: typedLocalPayment.contrato_id,
            paymentId: typedLocalPayment.id,
            eventType: 'payment.webhook_synced',
            title: 'Pagamento conciliado pelo webhook',
            description: `O webhook confirmou o pagamento ${typedLocalPayment.id} com status ${mpPayment.status}.`,
            severity: localStatus === 'pago' ? 'success' : 'info',
            metadata: {
              mercadoPagoStatus: mpPayment.status,
              localStatus,
            },
          })
        }
      }

      const shouldAttemptConfirmationEmail =
        localStatus === 'pago' &&
        Boolean(aluno?.email) &&
        !(await hasPaymentEmailLog(supabase, typedLocalPayment.id, 'payment.confirmation_email_sent'))

      if (shouldAttemptConfirmationEmail) {
        const { count: totalParcelasCount } = await supabase
          .from('pagamentos')
          .select('id', { head: true, count: 'exact' })
          .eq('contrato_id', typedLocalPayment.contrato_id)

        try {
          const emailResult = (await enviarConfirmacaoPagamento({
            to: aluno?.email || '',
            nomeAluno: aluno?.full_name || 'Aluno',
            parcela: typedLocalPayment.parcela_num || 1,
            totalParcelas: totalParcelasCount || typedLocalPayment.parcela_num || 1,
            valor: typedLocalPayment.valor,
            dataPagamento: formatDateForEmail(new Date().toISOString().split('T')[0]),
          })) as { error?: { message?: string } | null } | null

          if (emailResult?.error) {
            await logActivityBestEffort({
              targetUserId: typedLocalPayment.contrato?.aluno_id,
              contractId: typedLocalPayment.contrato_id,
              paymentId: typedLocalPayment.id,
              eventType: 'payment.confirmation_email_failed',
              title: 'Falha ao enviar confirmação de pagamento',
              description: `O pagamento ${typedLocalPayment.id} foi confirmado, mas o e-mail não pôde ser entregue.`,
              severity: 'warning',
              metadata: {
                message: emailResult.error.message || null,
              },
            })
          } else {
            await logActivityBestEffort({
              targetUserId: typedLocalPayment.contrato?.aluno_id,
              contractId: typedLocalPayment.contrato_id,
              paymentId: typedLocalPayment.id,
              eventType: 'payment.confirmation_email_sent',
              title: 'Confirmação de pagamento enviada',
              description: `O pagamento ${typedLocalPayment.id} foi confirmado por e-mail ao aluno.`,
              severity: 'success',
              metadata: {
                mercadoPagoStatus: mpPayment.status,
              },
            })
          }
        } catch (error) {
          console.error('Payment confirmation email error:', error)
          await logActivityBestEffort({
            targetUserId: typedLocalPayment.contrato?.aluno_id,
            contractId: typedLocalPayment.contrato_id,
            paymentId: typedLocalPayment.id,
            eventType: 'payment.confirmation_email_failed',
            title: 'Falha ao enviar confirmação de pagamento',
            description: `O pagamento ${typedLocalPayment.id} foi confirmado, mas o envio do e-mail falhou.`,
            severity: 'warning',
            metadata: {
              message: error instanceof Error ? error.message : 'unknown_error',
            },
          })
        }
      }
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
