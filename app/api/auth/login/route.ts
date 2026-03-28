import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao autenticar'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = body.email?.trim()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Não foi possível autenticar.' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      success: true,
      redirectTo: profile?.role === 'professor' ? '/professor' : '/aluno',
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
