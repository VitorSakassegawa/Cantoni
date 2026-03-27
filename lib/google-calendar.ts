import 'server-only'
import { google } from 'googleapis'

function formatLevelLabel(level?: string | null) {
  if (!level) {
    return 'Not defined yet'
  }

  return level
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBookLabel(book?: string | null) {
  return book?.trim() || 'To be defined in class'
}

export function buildLessonInviteTitle({
  studentName,
  isBonus = false,
  isRescheduled = false,
}: {
  studentName: string
  isBonus?: boolean
  isRescheduled?: boolean
}) {
  const tags = [
    isBonus ? 'Bonus Lesson' : null,
    isRescheduled ? 'Rescheduled' : null,
  ].filter(Boolean)

  return `🇺🇸 English Lesson • ${studentName}${tags.length ? ` • ${tags.join(' • ')}` : ''}`
}

export function buildLessonInviteDescription({
  studentName,
  level,
  book,
  portalUrl,
  isBonus = false,
  isRescheduled = false,
}: {
  studentName: string
  level?: string | null
  book?: string | null
  portalUrl: string
  isBonus?: boolean
  isRescheduled?: boolean
}) {
  const lessonLabel = isBonus
    ? 'BONUS ENGLISH LESSON'
    : isRescheduled
      ? 'RESCHEDULED ENGLISH LESSON'
      : 'ENGLISH LESSON'

  return [
    '🇺🇸 CANTONI ENGLISH SCHOOL',
    '',
    lessonLabel,
    '',
    `Student: ${studentName}`,
    `Level: ${formatLevelLabel(level)}`,
    `Material: ${formatBookLabel(book)}`,
    'Format: Online via Google Meet',
    '',
    'Portal access:',
    portalUrl,
    '',
    'Class guidance:',
    '- Open the Google Meet link attached to this invite.',
    '- Please join a few minutes early to settle in comfortably.',
    '- If you need to reschedule, let us know at least 2 hours in advance.',
  ].join('\n')
}

export function getGoogleAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  }

  return auth
}

export function getCalendar() {
  const auth = getGoogleAuth()
  return google.calendar({ version: 'v3', auth })
}

export async function criarEventoMeet({
  titulo,
  dataHora,
  duracaoMinutos = 45,
  emailAluno,
  emailProfessor,
  descricao,
}: {
  titulo: string
  dataHora: Date
  duracaoMinutos?: number
  emailAluno: string
  emailProfessor: string
  descricao?: string
}) {
  try {
    const calendar = getCalendar()
    const dataFim = new Date(dataHora.getTime() + duracaoMinutos * 60 * 1000)

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: titulo,
        description: descricao,
        location: 'Google Meet',
        start: { dateTime: dataHora.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: dataFim.toISOString(), timeZone: 'America/Sao_Paulo' },
        attendees: [{ email: emailAluno }],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 60 },
          ],
        },
      },
    })

    const meetLink =
      event.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || ''

    return {
      success: true,
      eventId: event.data.id!,
      meetLink,
    }
  } catch (error) {
    console.error('GCAL: Error creating event:', error)
    return { success: false, eventId: '', meetLink: '', error }
  }
}

export async function atualizarEventoCalendar(
  eventId: string,
  novaDataHora: Date,
  duracaoMinutos = 45
) {
  try {
    const calendar = getCalendar()
    const dataFim = new Date(novaDataHora.getTime() + duracaoMinutos * 60 * 1000)

    const event = await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      conferenceDataVersion: 1,
      requestBody: {
        start: { dateTime: novaDataHora.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: dataFim.toISOString(), timeZone: 'America/Sao_Paulo' },
      },
    })

    return { success: true, data: event.data }
  } catch (error) {
    console.error('GCAL: Error updating event:', error)
    return { success: false, error }
  }
}

export async function deletarEventoCalendar(eventId: string) {
  try {
    const calendar = getCalendar()
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
    })
    return { success: true }
  } catch (error) {
    console.error('GCAL: Error deleting event:', error)
    return { success: false, error }
  }
}
