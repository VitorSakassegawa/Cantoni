import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireProfessor } from '@/lib/auth'
import { runMarkOverduePayments } from '@/lib/overdue-payments'

export async function POST() {
  try {
    await requireProfessor()

    const result = await runMarkOverduePayments()
    revalidatePath('/professor/cron')
    revalidatePath('/professor/pagamentos')

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar pagamentos atrasados.'
    const status = message.includes('apenas professores') ? 403 : message.includes('Não autenticado') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
