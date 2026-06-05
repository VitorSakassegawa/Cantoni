import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildEncryptedCpfColumns } from '@/lib/cpf-security'

const alunoUpdateSchema = z.object({
  aluno_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).nullish(),
  cpf: z.string().trim().max(20).nullish(),
  birth_date: z.string().trim().max(10).nullish(),
  nivel: z.string().trim().max(40).nullish(),
  data_inscricao: z.string().trim().max(10).nullish(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar se o usuário é professor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas professores podem editar alunos' }, { status: 403 })
  }

  const parsed = alunoUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  const { aluno_id, full_name, phone, cpf, birth_date, nivel, data_inscricao } = parsed.data

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone,
      ...buildEncryptedCpfColumns(cpf),
      birth_date,
      nivel,
      data_inscricao,
    })
    .eq('id', aluno_id)


  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
