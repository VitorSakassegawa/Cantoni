import { google } from 'googleapis'

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
      attendees: [{ email: emailAluno }, { email: emailProfessor }],
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
    eventId: event.data.id!,
    meetLink,
  }
}

export async function atualizarEventoCalendar(
  eventId: string,
  novaDataHora: Date,
  duracaoMinutos = 45
) {
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

  return event.data
}

export async function deletarEventoCalendar(eventId: string) {
  const calendar = getCalendar()
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  })
}
