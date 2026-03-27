import { NextRequest, NextResponse } from 'next/server'
import { getCronSecret } from '@/lib/env'
import { runMeetTranscriptImport } from '@/lib/meet-transcript-import'

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true'
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-cron-secret')
  if (token !== getCronSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50)
  const lookbackDays = Math.min(Number(url.searchParams.get('days') || '7'), 30)
  const force = parseBoolean(url.searchParams.get('force'))
  try {
    const result = await runMeetTranscriptImport({
      limit,
      lookbackDays,
      force,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import transcripts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
