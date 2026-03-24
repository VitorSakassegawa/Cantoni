import { NextResponse } from 'next/server'
import { requireProfessor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  await requireProfessor()

  const { searchParams } = new URL(request.url)
  const alunoId = searchParams.get('alunoId')

  if (!alunoId) {
    return NextResponse.json({ error: 'alunoId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('placement_results')
    .select('*')
    .eq('student_id', alunoId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
