-- ============================================================
-- Teacher Gabriel Cantoni - Supabase schema snapshot
-- ============================================================

create extension if not exists pgcrypto;

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'aluno' check (role in ('professor', 'aluno')),
  full_name text not null,
  email text unique not null,
  phone text,
  cpf text,
  birth_date date,
  data_inscricao date,
  nivel text check (nivel in ('iniciante', 'basico', 'intermediario', 'avancado', 'conversacao', 'certificado')),
  tipo_aula text check (tipo_aula in ('regular', 'conversacao', 'certificado')),
  cefr_level text default 'A1' check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  streak_count integer default 0,
  best_streak integer default 0,
  last_activity_date date,
  placement_test_completed boolean default false,
  created_at timestamptz not null default now()
);

-- PLANOS
create table if not exists planos (
  id serial primary key,
  freq_semana integer check (freq_semana in (1, 2)),
  aulas_totais integer not null,
  remarca_max_mes integer not null,
  descricao text
);

insert into planos (freq_semana, aulas_totais, remarca_max_mes, descricao)
values
  (1, 20, 1, 'Plano 1x por semana - 20 aulas/semestre, 1 remarcacao gratuita/mes'),
  (2, 40, 2, 'Plano 2x por semana - 40 aulas/semestre, 2 remarcacoes gratuitas/mes')
on conflict do nothing;

-- CONTRATOS
create table if not exists contratos (
  id serial primary key,
  aluno_id uuid not null references profiles(id) on delete cascade,
  plano_id integer references planos(id),
  data_inicio date not null,
  data_fim date not null,
  semestre text check (semestre in ('jan-jun', 'jul-dez', 'jan-jul', 'aug-dez', 'ago-dez')),
  ano integer not null,
  aulas_totais integer not null,
  aulas_dadas integer not null default 0,
  aulas_restantes integer not null,
  status text not null default 'ativo' check (status in ('ativo', 'vencido', 'cancelado', 'inativo')),
  status_financeiro text not null default 'em_dia' check (status_financeiro in ('em_dia', 'pendente')),
  livro_atual text,
  nivel_atual text,
  horario text,
  valor numeric(10, 2),
  dia_vencimento integer,
  forma_pagamento text,
  tipo_contrato text not null default 'semestral' check (tipo_contrato in ('semestral', 'ad-hoc')),
  desconto_valor numeric(10, 2) not null default 0,
  desconto_percentual numeric(5, 2) not null default 0,
  dias_da_semana integer[],
  infinitepay_customer_id text,
  created_at timestamptz not null default now()
);

-- AULAS
create table if not exists aulas (
  id serial primary key,
  contrato_id integer not null references contratos(id) on delete cascade,
  google_event_id text unique,
  data_hora timestamptz not null,
  duracao_minutos integer not null default 45,
  status text not null default 'agendada' check (
    status in (
      'agendada',
      'confirmada',
      'dada',
      'cancelada',
      'remarcada',
      'pendente_remarcacao',
      'pendente_remarcacao_rejeitada'
    )
  ),
  aviso_horas_antecedencia numeric,
  remarcada_de integer references aulas(id),
  meet_link text,
  homework text,
  has_homework boolean not null default true,
  homework_completed boolean not null default false,
  homework_notificado boolean not null default false,
  homework_type text check (homework_type in ('regular', 'esl_brains', 'evolve')),
  homework_link text,
  homework_due_date timestamptz,
  homework_image_url text,
  class_notes text,
  ai_summary_sent boolean not null default false,
  ai_summary_pt text,
  ai_summary_en text,
  vocabulary_json jsonb,
  data_hora_solicitada timestamptz,
  justificativa_professor text,
  motivo_remarcacao text,
  is_bonus boolean not null default false,
  created_at timestamptz not null default now()
);

-- REMARCACOES
create table if not exists remarcacoes_mes (
  id serial primary key,
  aluno_id uuid not null references profiles(id) on delete cascade,
  mes date not null,
  quantidade integer not null default 0,
  unique (aluno_id, mes)
);

-- PAGAMENTOS
create table if not exists pagamentos (
  id serial primary key,
  contrato_id integer not null references contratos(id) on delete cascade,
  parcela_num integer check (parcela_num between 1 and 6),
  valor numeric(10, 2) not null,
  data_vencimento date not null,
  data_pagamento date,
  forma text check (forma in ('pix', 'cartao', 'dinheiro', 'boleto', 'credit_card', 'debit_card')),
  infinitepay_invoice_id text unique,
  mercadopago_id text unique,
  mercadopago_status text,
  mercadopago_payment_method text,
  pix_qrcode_base64 text,
  pix_copia_cola text,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'vencido')),
  email_enviado boolean not null default false,
  lembrete_enviado boolean not null default false,
  created_at timestamptz not null default now()
);

-- RECESSOS
create table if not exists recessos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data_inicio date not null,
  data_fim date not null,
  tipo text not null check (tipo in ('recesso', 'feriado', 'ferias')),
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- FLASHCARDS
create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  word text not null,
  translation text not null,
  example text,
  interval integer not null default 0,
  repetitions integer not null default 0,
  ease_factor numeric(4, 2) not null default 2.5,
  next_review timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- AVALIACOES
create table if not exists avaliacoes_habilidades (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references profiles(id) on delete cascade,
  contrato_id integer references contratos(id) on delete set null,
  mes_referencia date not null,
  speaking integer not null check (speaking between 1 and 10),
  listening integer not null check (listening between 1 and 10),
  reading integer not null check (reading between 1 and 10),
  writing integer not null check (writing between 1 and 10),
  comentarios text,
  created_at timestamptz not null default now(),
  unique (aluno_id, mes_referencia)
);

-- PLACEMENT RESULTS
create table if not exists placement_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  score integer not null,
  total_questions integer not null,
  answers jsonb not null,
  insights text,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  actor_user_id uuid references profiles(id) on delete set null,
  target_user_id uuid references profiles(id) on delete set null,
  contract_id integer references contratos(id) on delete set null,
  lesson_id integer references aulas(id) on delete set null,
  payment_id integer references pagamentos(id) on delete set null,
  event_type text not null,
  title text not null,
  description text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'success')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_aulas_contrato_id on aulas (contrato_id);
create index if not exists idx_aulas_remarcada_de on aulas (remarcada_de);
create index if not exists idx_avaliacoes_habilidades_contrato_id on avaliacoes_habilidades (contrato_id);
create index if not exists idx_activity_logs_actor_user_id on activity_logs (actor_user_id);
create index if not exists idx_activity_logs_target_user_id on activity_logs (target_user_id);
create index if not exists idx_activity_logs_contract_id on activity_logs (contract_id);
create index if not exists idx_activity_logs_lesson_id on activity_logs (lesson_id);
create index if not exists idx_activity_logs_payment_id on activity_logs (payment_id);
create index if not exists idx_activity_logs_created_at on activity_logs (created_at desc);
create index if not exists idx_contratos_aluno_id on contratos (aluno_id);
create index if not exists idx_contratos_plano_id on contratos (plano_id);
create index if not exists idx_flashcards_aluno_id on flashcards (aluno_id);
create index if not exists idx_pagamentos_contrato_id on pagamentos (contrato_id);
create index if not exists idx_placement_results_student_id on placement_results (student_id);
create index if not exists idx_recessos_criado_por on recessos (criado_por);

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table planos enable row level security;
alter table contratos enable row level security;
alter table aulas enable row level security;
alter table remarcacoes_mes enable row level security;
alter table pagamentos enable row level security;
alter table recessos enable row level security;
alter table flashcards enable row level security;
alter table avaliacoes_habilidades enable row level security;
alter table placement_results enable row level security;
alter table activity_logs enable row level security;

create or replace function is_professor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = (select auth.uid()) and role = 'professor'
  );
$$;

create policy "planos_read_all" on planos for select using (true);

create policy "profiles_select_policy" on profiles for select using (is_professor() or id = (select auth.uid()));
create policy "profiles_insert_professor_policy" on profiles for insert with check (is_professor());
create policy "profiles_update_policy" on profiles for update using (is_professor() or id = (select auth.uid())) with check (is_professor() or id = (select auth.uid()));
create policy "profiles_delete_professor_policy" on profiles for delete using (is_professor());

create policy "contratos_select_policy" on contratos for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "contratos_insert_professor_policy" on contratos for insert with check (is_professor());
create policy "contratos_update_professor_policy" on contratos for update using (is_professor()) with check (is_professor());
create policy "contratos_delete_professor_policy" on contratos for delete using (is_professor());

create policy "aulas_select_policy" on aulas for select using (
  is_professor() or contrato_id in (
    select c.id
    from contratos c
    where c.aluno_id = (select auth.uid())
  )
);
create policy "aulas_insert_professor_policy" on aulas for insert with check (is_professor());
create policy "aulas_update_professor_policy" on aulas for update using (is_professor()) with check (is_professor());
create policy "aulas_delete_professor_policy" on aulas for delete using (is_professor());

create policy "remarcacoes_select_policy" on remarcacoes_mes for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "remarcacoes_insert_professor_policy" on remarcacoes_mes for insert with check (is_professor());
create policy "remarcacoes_update_professor_policy" on remarcacoes_mes for update using (is_professor()) with check (is_professor());
create policy "remarcacoes_delete_professor_policy" on remarcacoes_mes for delete using (is_professor());

create policy "pagamentos_select_policy" on pagamentos for select using (
  is_professor() or contrato_id in (
    select c.id
    from contratos c
    where c.aluno_id = (select auth.uid())
  )
);
create policy "pagamentos_insert_professor_policy" on pagamentos for insert with check (is_professor());
create policy "pagamentos_update_professor_policy" on pagamentos for update using (is_professor()) with check (is_professor());
create policy "pagamentos_delete_professor_policy" on pagamentos for delete using (is_professor());

create policy "recessos_select_policy" on recessos for select using (true);
create policy "recessos_insert_professor_policy" on recessos for insert with check (is_professor());
create policy "recessos_update_professor_policy" on recessos for update using (is_professor()) with check (is_professor());
create policy "recessos_delete_professor_policy" on recessos for delete using (is_professor());

create policy "flashcards_select_policy" on flashcards for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "flashcards_insert_policy" on flashcards for insert with check (is_professor() or aluno_id = (select auth.uid()));
create policy "flashcards_update_policy" on flashcards for update using (is_professor() or aluno_id = (select auth.uid())) with check (is_professor() or aluno_id = (select auth.uid()));
create policy "flashcards_delete_policy" on flashcards for delete using (is_professor() or aluno_id = (select auth.uid()));

create policy "avaliacoes_select_policy" on avaliacoes_habilidades for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "avaliacoes_insert_professor_policy" on avaliacoes_habilidades for insert with check (is_professor());
create policy "avaliacoes_update_professor_policy" on avaliacoes_habilidades for update using (is_professor()) with check (is_professor());
create policy "avaliacoes_delete_professor_policy" on avaliacoes_habilidades for delete using (is_professor());

create policy "placement_results_select_policy" on placement_results for select using (is_professor() or student_id = (select auth.uid()));
create policy "placement_results_insert_policy" on placement_results for insert with check (is_professor() or student_id = (select auth.uid()));
create policy "placement_results_update_professor_policy" on placement_results for update using (is_professor()) with check (is_professor());
create policy "placement_results_delete_professor_policy" on placement_results for delete using (is_professor());

create policy "activity_logs_select_policy" on activity_logs for select using (
  is_professor()
  or target_user_id = (select auth.uid())
  or actor_user_id = (select auth.uid())
);

-- ============================================================
-- CONTRACT HELPERS
-- ============================================================

create or replace function atualizar_contagem_aulas()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update contratos
  set aulas_dadas = (
        select count(*) from aulas where contrato_id = new.contrato_id and status = 'dada'
      ),
      aulas_restantes = aulas_totais - (
        select count(*) from aulas where contrato_id = new.contrato_id and status = 'dada'
      )
  where id = new.contrato_id;
  return new;
end;
$$;

drop trigger if exists trigger_atualizar_contagem on aulas;
create trigger trigger_atualizar_contagem
after insert or update on aulas
for each row execute function atualizar_contagem_aulas();

create or replace function concluir_aula_v2(
  p_aula_id integer,
  p_contrato_id integer,
  p_aulas_dadas integer,
  p_aulas_restantes integer,
  p_status_financeiro text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update aulas
  set status = 'dada'
  where id = p_aula_id
    and status <> 'dada';

  if not found then
    return;
  end if;

  update contratos
  set aulas_dadas = p_aulas_dadas,
      aulas_restantes = p_aulas_restantes,
      status_financeiro = p_status_financeiro
  where id = p_contrato_id;
end;
$$;

create or replace function register_student_activity_streak(
  p_student_id uuid,
  p_activity_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_activity date;
  v_streak integer;
begin
  select last_activity_date, coalesce(streak_count, 0)
  into v_last_activity, v_streak
  from profiles
  where id = p_student_id
  for update;

  if not found then
    return;
  end if;

  if v_last_activity = p_activity_date then
    return;
  end if;

  if v_last_activity is not null and v_last_activity > p_activity_date then
    return;
  end if;

  update profiles
  set streak_count = case
      when v_last_activity = p_activity_date - interval '1 day' then greatest(v_streak, 1) + 1
      else 1
    end,
    best_streak = greatest(coalesce(best_streak, 0), case
      when v_last_activity = p_activity_date - interval '1 day' then greatest(v_streak, 1) + 1
      else 1
    end),
    last_activity_date = p_activity_date
  where id = p_student_id;
end;
$$;
