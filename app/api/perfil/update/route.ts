import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildEncryptedCpfColumns } from '@/lib/cpf-security'

const perfilUpdateSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).nullish(),
  cpf: z.string().trim().max(20).nullish(),
  birth_date: z.string().trim().max(10).nullish(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const parsed = perfilUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  const { full_name, phone, cpf, birth_date } = parsed.data

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
