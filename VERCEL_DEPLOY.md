# Vercel Deploy

## 1. Import the repository

Create a new Vercel project and connect this repository.

## 2. Configure environment variables

At minimum, configure these in the Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
CPF_ENCRYPTION_KEY=
CRON_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Add Google variables if the integration is enabled:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_OAUTH_SETUP_SECRET=
```

Important:

- `NEXT_PUBLIC_*` variables are embedded at build time
- after changing them, redeploy
- the build already fails fast if critical variables are missing

## 3. Webhooks

Mercado Pago production webhook:

```text
https://cantonies.com.br/api/webhooks/mercadopago
```

## 4. Cron on Hobby

Current `vercel.json` keeps only:

- `/api/cron/marcar-atrasados`

Why:

- Vercel Hobby only supports cron jobs that run once per day
- Vercel does not guarantee precise execution timing inside the target hour

Because of that:

- lesson reminders stay manual in `/professor/cron`
- transcript import can be manual or scheduled by an external service

## 5. Recommended production checks

After each deploy, validate:

1. login
2. first access password setup
3. Mercado Pago PIX creation
4. webhook reconciliation
5. document rendering
6. transcript import flow
