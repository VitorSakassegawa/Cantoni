# Row Level Security

The project relies on Supabase RLS for all student-facing data access.

## Core model

- `profiles`: professor can read/write everyone; each authenticated user can read/update only their own profile.
- `contratos`, `aulas`, `pagamentos`, `flashcards`, `avaliacoes_habilidades`, `placement_results`, `document_issuances`, `activity_logs`: professor has broad access; students only see rows tied to their own `auth.uid()`.
- `planos`: readable by everyone.
- `recessos`: readable by authenticated users; professor manages writes.
- `auth_rate_limits`: enabled only so service-role traffic remains explicit; application code accesses it exclusively through `security definer` function `consume_rate_limit`.

## Security-definer helpers

- `is_professor()`: central role helper used by policies.
- `accept_document_issuance(...)`: controlled document acceptance flow.
- `consume_rate_limit(...)`: atomic rate-limit counter for password recovery.

## Operational note

When changing policies, update both:

1. `supabase/schema.sql`
2. the corresponding SQL file in `supabase/migrations/`

This repository now treats the migration files as the source of change history and `schema.sql` as the latest snapshot.
