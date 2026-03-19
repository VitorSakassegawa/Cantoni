import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-cron-secret')
  if (token !== process.env.INFINITEPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoje = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pagamentos')
    .update({ status: 'atrasado' })
    .eq('status', 'pendente')
    .lt('data_vencimento', hoje)
    .select()

  return NextResponse.json({ updated: data?.length || 0, error })
}
