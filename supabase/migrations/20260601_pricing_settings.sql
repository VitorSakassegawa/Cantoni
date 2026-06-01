-- Configuração de preços-padrão (singleton) + histórico de reajustes (ex.: IPCA)
-- + justificativa de desvio de valor no contrato.

-- 1) Tabela singleton de preços-padrão por tipo de contrato.
create table if not exists pricing_settings (
  id boolean primary key default true,
  price_semestral_1x numeric(10,2) not null default 1920,
  price_semestral_2x numeric(10,2) not null default 2880,
  price_avulsa numeric(10,2) not null default 90,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint pricing_settings_singleton check (id = true)
);

insert into pricing_settings (id) values (true) on conflict (id) do nothing;

-- 2) Histórico de reajustes/alterações de preço (auditoria; IPCA anual etc.).
create table if not exists pricing_adjustments (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('ipca', 'manual')),
  percent numeric(6,3),
  prices_before jsonb not null,
  prices_after jsonb not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 3) Snapshot do preço-padrão e justificativa quando o valor foge do padrão.
alter table contratos
  add column if not exists valor_padrao numeric(10,2),
  add column if not exists pricing_override_reason text;

-- 4) RLS: só o professor lê/escreve preços e reajustes.
alter table pricing_settings enable row level security;
alter table pricing_adjustments enable row level security;

drop policy if exists "pricing_settings_select_professor" on pricing_settings;
drop policy if exists "pricing_settings_update_professor" on pricing_settings;
drop policy if exists "pricing_settings_insert_professor" on pricing_settings;
create policy "pricing_settings_select_professor" on pricing_settings for select using (is_professor());
create policy "pricing_settings_update_professor" on pricing_settings for update using (is_professor()) with check (is_professor());
create policy "pricing_settings_insert_professor" on pricing_settings for insert with check (is_professor());

drop policy if exists "pricing_adjustments_select_professor" on pricing_adjustments;
drop policy if exists "pricing_adjustments_insert_professor" on pricing_adjustments;
create policy "pricing_adjustments_select_professor" on pricing_adjustments for select using (is_professor());
create policy "pricing_adjustments_insert_professor" on pricing_adjustments for insert with check (is_professor());
