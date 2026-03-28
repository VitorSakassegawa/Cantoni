import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireProfessor } from '@/lib/auth'
import { runLessonReminders } from '@/lib/lesson-reminders'

export async function POST() {
  try {
    await requireProfessor()

    const result = await runLessonReminders({ windowHoursStart: 0, windowHoursEnd: 24 })
    revalidatePath('/professor/cron')

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao rodar os lembretes de aula.'
    const status = message.includes('apenas professores') ? 403 : message.includes('Não autenticado') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
