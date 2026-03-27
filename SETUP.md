# Cantoni English School — Setup Guide

## 1. Supabase: Run the schema

Go to your Supabase project → SQL Editor → paste and run `supabase/schema.sql`.

## 2. Configure environment variables

Edit `.env.local` with your real keys:

| Variable | Where to get |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 |
| `GOOGLE_REFRESH_TOKEN` | After step 3 below |
| `GOOGLE_OAUTH_SETUP_SECRET` | Any long random secret used to unlock Google OAuth setup in production |
| `INFINITEPAY_API_KEY` | InfinitePay dashboard → Developers |
| `INFINITEPAY_WEBHOOK_SECRET` | Any secret string; configure same in InfinitePay webhook |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Your verified domain email |

## 3. Get Google refresh token

1. Go to Google Cloud Console → create OAuth 2.0 credentials (Web Application)
2. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
3. For production setup, also add: `https://cantonies.com.br/api/auth/google/callback`
4. Start dev server: `npm run dev`
5. Visit: `http://localhost:3000/api/auth/google`
6. Authorize and copy the `refresh_token` from the response
7. Paste it as `GOOGLE_REFRESH_TOKEN` in `.env.local`

Production alternative:
1. Set `GOOGLE_OAUTH_SETUP_SECRET` in Vercel
2. Open `https://cantonies.com.br/api/auth/google?setup=YOUR_SECRET`
3. Authorize the Google account you want as the calendar organizer
4. Copy the returned `refresh_token`
5. Update `GOOGLE_REFRESH_TOKEN` in Vercel and redeploy

## 4. Create professor account in Supabase

In Supabase SQL Editor:
```sql
-- After you register via Supabase Auth, update your profile:
UPDATE profiles SET role = 'professor' WHERE email = 'gabriel@youremail.com';
```

Or use Supabase Auth → Users → create user manually → then run the above SQL.

## 5. Configure InfinitePay webhook

In InfinitePay developer dashboard, add webhook:
- URL: `https://your-site.netlify.app/api/webhooks/infinitepay`
- Events: `charge.paid`

## 6. Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify
3. Set all `.env.local` variables as Netlify environment variables
4. Build command: `next build`
5. Publish directory: `.next`

## 7. Configure cron jobs (automated tasks)

Option A — Supabase pg_cron (recommended):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Mark overdue payments daily at 8am BRT
SELECT cron.schedule('marcar-atrasados', '0 11 * * *',
  $$UPDATE pagamentos SET status = 'atrasado' WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE$$
);
```

Option B — External cron (e.g., cron-job.org):
- Call `GET /api/cron/lembretes-aula` hourly with header `x-cron-secret: your_webhook_secret`
- Call `GET /api/cron/marcar-atrasados` daily with same header

## 8. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 → redirects to /login.

