import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: Boolean(user) })
  } catch {
    return NextResponse.json({ valid: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      accessToken?: string
      refreshToken?: string
    }

    const accessToken = body.accessToken?.trim()
    const refreshToken = body.refreshToken?.trim()

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Tokens de recuperação ausentes.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message ?? 'Não foi possível validar o link de recuperação.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, 'Erro ao inicializar a recuperação de senha.') },
      { status: 500 }
    )
  }
}
