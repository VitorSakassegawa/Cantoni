import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { criarCobrancaPix } from '@/lib/infinitepay'
import { enviarEmailCobranca } from '@/lib/resend'
import { getFifthBusinessDay } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (prof?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professor pode gerar cobranças' }, { status: 403 })
  }

  const { pagamentoId } = await request.json()
  const serviceSupabase = await createServiceClient()

  const { data: pagamento } = await serviceSupabase
    .from('pagamentos')
    .select('*, contratos(*, profiles(*))')
    .eq('id', pagamentoId)
    .single()

  if (!pagamento) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  const contrato = pagamento.contratos as any
  const aluno = contrato.profiles

  const venc = new Date(pagamento.data_vencimento)
  const vencimento = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}-${String(venc.getDate()).padStart(2, '0')}`

  const cobranca = await criarCobrancaPix({
    amount: Math.round(pagamento.valor * 100),
    description: `Aulas de Inglês Teacher Gabriel — Parcela ${pagamento.parcela_num}/6`,
    customerName: aluno.full_name,
    customerEmail: aluno.email,
    dueDate: vencimento,
    externalId: `pagamento-${pagamento.id}`,
  })

  await serviceSupabase
    .from('pagamentos')
    .update({
      infinitepay_invoice_id: cobranca.invoiceId,
      pix_qrcode_base64: cobranca.pixQrcodeUrl || cobranca.pixQrcodeBase64,
      pix_copia_cola: cobranca.pixCopiaCola,
      email_enviado: true,
    })
    .eq('id', pagamentoId)

  await enviarEmailCobranca({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    parcela: pagamento.parcela_num,
    totalParcelas: 6,
    valor: pagamento.valor,
    vencimento: new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR'),
    pixCopiaCola: cobranca.pixCopiaCola,
    pixQrcode: cobranca.pixQrcodeUrl,
  })

  return NextResponse.json({ success: true, cobranca })
}
