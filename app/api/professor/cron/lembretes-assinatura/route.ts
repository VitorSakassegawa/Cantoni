import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireProfessor } from '@/lib/auth'
import { runSignatureReminders } from '@/lib/signature-reminders'

export async function POST() {
  try {
    await requireProfessor()

    // Execução manual: considera todos os contratos pendentes de aceite,
    // respeitando o intervalo mínimo entre lembretes e o teto por contrato.
    const result = await runSignatureReminders({ minHoursSinceIssue: 0 })
    revalidatePath('/professor/cron')

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Falha ao enviar lembretes de assinatura.'
    const status = message.includes('apenas professores')
      ? 403
      : message.toLowerCase().includes('autenticad')
        ? 401
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
