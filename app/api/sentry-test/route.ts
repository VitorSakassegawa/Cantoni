// TEMPORARY route to verify Sentry is capturing events end-to-end.
// Delete after confirming the event shows up in Sentry → Issues.
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Explicit event (most reliable for verification) + flush so it is sent
  // before the serverless function exits.
  Sentry.captureMessage('Sentry test event (manual verification) — safe to ignore', 'error')
  await Sentry.flush(3000)

  // Also throw so the onRequestError instrumentation path is exercised.
  throw new Error('Sentry test error (intentional) — safe to ignore')
}
