import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEncryptedCpfColumns } from '@/lib/cpf-security'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { full_name, phone, cpf, birth_date } = await request.json()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone,
      ...buildEncryptedCpfColumns(cpf),
      birth_date,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
