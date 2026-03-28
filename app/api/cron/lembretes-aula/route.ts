import { NextRequest, NextResponse } from 'next/server'
import { isValidCronRequest } from '@/lib/cron-security'
import { runLessonReminders } from '@/lib/lesson-reminders'

export async function GET(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runLessonReminders()
  return NextResponse.json(result)
}
