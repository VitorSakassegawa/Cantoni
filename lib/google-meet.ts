import 'server-only'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-calendar'

const TRANSCRIPT_HEADER = '## Transcript imported from Google Meet'
const MEETING_CODE_PATTERN = /([a-z]+-[a-z]+-[a-z]+)/i

type ConferenceRecord = {
  name?: string | null
  startTime?: string | null
  endTime?: string | null
}

type TranscriptResource = {
  name?: string | null
  docsDestination?: {
    exportUri?: string | null
  } | null
  startTime?: string | null
  endTime?: string | null
  state?: string | null
}

export type ImportedMeetTranscript = {
  meetingCode: string
  conferenceRecord: string
  transcriptName: string
  transcriptText: string
  transcriptDocUrl?: string | null
  transcriptStartedAt?: string | null
  transcriptEndedAt?: string | null
}

function formatTranscriptDuration(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return null
  }

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return null
  }

  const totalSeconds = Math.round((endTime - startTime) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function getMeetClient() {
  const auth = getGoogleAuth()
  return google.meet({ version: 'v2', auth })
}

export function extractMeetingCodeFromLink(meetLink?: string | null) {
  if (!meetLink) {
    return null
  }

  try {
    const url = new URL(meetLink)
    const match = url.pathname.match(MEETING_CODE_PATTERN)
    return match?.[1]?.toLowerCase() ?? null
  } catch {
    const match = meetLink.match(MEETING_CODE_PATTERN)
    return match?.[1]?.toLowerCase() ?? null
  }
}

function buildConferenceFilter(meetingCode: string, scheduledAt: Date) {
  const startWindow = new Date(scheduledAt.getTime() - 12 * 60 * 60 * 1000).toISOString()
  const endWindow = new Date(scheduledAt.getTime() + 36 * 60 * 60 * 1000).toISOString()

  return `space.meeting_code = "${meetingCode}" AND start_time >= "${startWindow}" AND start_time <= "${endWindow}"`
}

function sortConferenceRecordsByDistance(records: ConferenceRecord[], scheduledAt: Date) {
  return [...records]
    .filter((record) => record.name && record.startTime)
    .sort((left, right) => {
      const leftDistance = Math.abs(new Date(left.startTime!).getTime() - scheduledAt.getTime())
      const rightDistance = Math.abs(new Date(right.startTime!).getTime() - scheduledAt.getTime())
      return leftDistance - rightDistance
    })
}

async function listTranscriptEntriesText(transcriptName: string) {
  const meet = getMeetClient()
  const chunks: string[] = []
  let pageToken: string | undefined

  do {
    const response = await meet.conferenceRecords.transcripts.entries.list({
      parent: transcriptName,
      pageSize: 200,
      pageToken,
    })

    for (const entry of response.data.transcriptEntries || []) {
      const text = entry.text?.trim()
      if (text) {
        chunks.push(text)
      }
    }

    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return chunks.join('\n\n').trim()
}

export async function importMeetTranscriptForLesson({
  meetLink,
  scheduledAt,
}: {
  meetLink?: string | null
  scheduledAt: string | Date
}): Promise<ImportedMeetTranscript | null> {
  const meetingCode = extractMeetingCodeFromLink(meetLink)
  if (!meetingCode) {
    return null
  }

  const scheduledDate = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)
  const meet = getMeetClient()
  const conferenceResponse = await meet.conferenceRecords.list({
    filter: buildConferenceFilter(meetingCode, scheduledDate),
    pageSize: 10,
  })

  const candidateRecords = sortConferenceRecordsByDistance(
    conferenceResponse.data.conferenceRecords || [],
    scheduledDate
  )

  if (candidateRecords.length === 0) {
    return null
  }

  for (const candidateRecord of candidateRecords) {
    const transcriptsResponse = await meet.conferenceRecords.transcripts.list({
      parent: candidateRecord.name!,
      pageSize: 20,
    })

    const transcript = [...(transcriptsResponse.data.transcripts || [])]
      .filter((item: TranscriptResource) => item.name)
      .sort((left, right) => {
        const leftTime = new Date(left.startTime || 0).getTime()
        const rightTime = new Date(right.startTime || 0).getTime()
        return rightTime - leftTime
      })[0]

    if (!transcript?.name) {
      continue
    }

    const transcriptText = await listTranscriptEntriesText(transcript.name)
    if (!transcriptText) {
      continue
    }

    return {
      meetingCode,
      conferenceRecord: candidateRecord.name!,
      transcriptName: transcript.name,
      transcriptText,
      transcriptDocUrl: transcript.docsDestination?.exportUri || null,
      transcriptStartedAt: transcript.startTime || null,
      transcriptEndedAt: transcript.endTime || null,
    }
  }

  return null
}

export function mergeTranscriptIntoLessonNotes(
  currentNotes: string | null | undefined,
  imported: ImportedMeetTranscript
) {
  const trimmedCurrent = currentNotes?.trim() || ''
  const durationLine = formatTranscriptDuration(imported.transcriptStartedAt, imported.transcriptEndedAt)
  const sourceLine = imported.transcriptDocUrl
    ? `Source document: ${imported.transcriptDocUrl}`
    : `Meeting code: ${imported.meetingCode}`
  const transcriptBlock = [
    TRANSCRIPT_HEADER,
    `Transcript record: ${imported.transcriptName}`,
    sourceLine,
    imported.transcriptStartedAt ? `Transcript started at: ${imported.transcriptStartedAt}` : null,
    imported.transcriptEndedAt ? `Transcript ended at: ${imported.transcriptEndedAt}` : null,
    durationLine ? `Transcript duration: ${durationLine}` : null,
    '',
    imported.transcriptText.trim(),
  ]
    .filter(Boolean)
    .join('\n')

  if (!trimmedCurrent) {
    return transcriptBlock
  }

  if (trimmedCurrent.includes(TRANSCRIPT_HEADER)) {
    const [beforeTranscript] = trimmedCurrent.split(TRANSCRIPT_HEADER)
    const preservedNotes = beforeTranscript.trim().replace(/\n+---\n*$/g, '').trim()
    return preservedNotes ? `${preservedNotes}\n\n---\n\n${transcriptBlock}` : transcriptBlock
  }

  return `${trimmedCurrent}\n\n---\n\n${transcriptBlock}`
}

export function hasImportedTranscript(notes: string | null | undefined) {
  return (notes || '').includes(TRANSCRIPT_HEADER)
}

export function extractImportedTranscriptName(notes: string | null | undefined) {
  const match = (notes || '').match(/Transcript record:\s*(.+)/)
  return match?.[1]?.trim() || null
}

export function truncateTranscriptForAI(text: string, maxLength = 14000) {
  const normalized = text.trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength)}\n\n[Transcript truncated for AI processing]`
}
