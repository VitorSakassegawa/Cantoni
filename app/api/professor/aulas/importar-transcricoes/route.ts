import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireProfessor } from '@/lib/auth'
import { runMeetTranscriptImport } from '@/lib/meet-transcript-import'

export async function POST() {
  try {
    await requireProfessor()

    const result = await runMeetTranscriptImport({
      limit: 20,
      lookbackDays: 7,
      force: false,
    })

    revalidatePath('/professor/aulas')

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao importar transcrições.'
    const status = message.includes('apenas professores') ? 403 : message.includes('Não autenticado') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
