import { NextRequest, NextResponse } from 'next/server'
import { isValidCronRequest } from '@/lib/cron-security'
import { runSignatureReminders } from '@/lib/signature-reminders'

export async function GET(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSignatureReminders()
  return NextResponse.json(result)
}
