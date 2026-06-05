// Sentry initialization for the Node.js server runtime.
// No-op unless SENTRY_DSN is set, so local dev / preview without a DSN is unaffected.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Capture 10% of transactions for performance tracing; raise if you want more.
  tracesSampleRate: 0.1,
})
