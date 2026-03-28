# Operations Notes

## Deployment environments

Recommended minimum setup:

- `main` -> production (`cantonies.com.br`)
- `staging` -> staging environment with isolated Supabase project and Vercel env vars

Do not promote database or payment changes directly to production without validating in staging first.

## Monitoring

Recommended immediate additions:

- Sentry for runtime exceptions
- Vercel Analytics / Speed Insights for user-facing regressions

The codebase already logs critical payment and contract events, but it still needs active alerting for production incidents.

## Vercel cron jobs

Cron configuration lives in `vercel.json`:

- `/api/cron/lembretes-aula` hourly
- `/api/cron/marcar-atrasados` daily at 06:00 UTC
- `/api/cron/importar-transcricoes-meet` every 30 minutes

Authentication:

- Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
- manual/local calls can still use `x-cron-secret: <CRON_SECRET>`

## Environment validation

Builds now fail fast when these core variables are missing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CPF_ENCRYPTION_KEY`

This prevents partially configured deployments from shipping a broken login flow.
