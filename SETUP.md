# Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create `.env.local` with the required values.

Core variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
CPF_ENCRYPTION_KEY=
```

Optional integrations:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_OAUTH_SETUP_SECRET=
CRON_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Notes:

- `NEXT_PUBLIC_*` variables must exist before build time.
- `CPF_ENCRYPTION_KEY` is required to decrypt and encrypt CPF data.
- after changing public variables in Vercel, redeploy the project.

## 3. Run the database schema

Use the files in `supabase/` as the source of truth.

- apply the schema and migrations in your Supabase project
- keep RLS aligned with `supabase/RLS.md`

## 4. Google setup

To generate a Google refresh token:

1. create OAuth credentials in Google Cloud
2. add these redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://cantonies.com.br/api/auth/google/callback`
3. enable the required Google APIs
4. visit `/api/auth/google`
5. complete the authorization flow
6. store the resulting `GOOGLE_REFRESH_TOKEN`

## 5. Mercado Pago webhook

Configure the production webhook URL as:

```text
https://cantonies.com.br/api/webhooks/mercadopago
```

Use the webhook secret from Mercado Pago in:

```env
MERCADOPAGO_WEBHOOK_SECRET=
```

## 6. Cron model

Current operating model:

- Vercel automatic cron: `/api/cron/marcar-atrasados`
- professor manual actions: `/professor/cron`
- optional external scheduler for transcript import:
  - `/api/cron/importar-transcricoes-meet`

Do not reintroduce hourly Vercel cron jobs on Hobby plans.

## 7. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.
