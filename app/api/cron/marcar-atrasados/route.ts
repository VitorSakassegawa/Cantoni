import { NextRequest, NextResponse } from 'next/server'
import { isValidCronRequest } from '@/lib/cron-security'
import { runMarkOverduePayments } from '@/lib/overdue-payments'

export async function GET(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runMarkOverduePayments()
  return NextResponse.json(result)
}
