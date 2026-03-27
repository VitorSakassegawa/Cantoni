-- ============================================================
-- Cantoni English School - Supabase schema snapshot
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
  parcela_num integer check (parcela_num >= 1),
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

create table if not exists contract_addenda (
  id bigserial primary key,
  contract_id integer not null references contratos(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  previous_total_value numeric(10, 2) not null,
  paid_value numeric(10, 2) not null default 0,
  previous_open_value numeric(10, 2) not null default 0,
  new_open_value numeric(10, 2) not null,
  previous_open_installments integer not null default 0,
  new_open_installments integer not null,
  previous_payment_method text,
  new_payment_method text,
  previous_due_day integer,
  new_due_day integer,
  first_due_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists contract_cancellations (
  id bigserial primary key,
  contract_id integer not null references contratos(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  cancelled_by uuid references profiles(id) on delete set null,
  effective_date date not null,
  reason_code text not null,
  reason_label text not null,
  reason_details text,
  notes text,
  lesson_action text not null check (lesson_action in ('auto_cancel_future', 'keep_future_for_review')),
  outstanding_action text not null check (outstanding_action in ('keep_open_balance', 'waive_open_balance')),
  credit_action text not null check (credit_action in ('no_credit', 'refund_manual', 'convert_to_credit')),
  paid_amount numeric(10, 2) not null default 0,
  consumed_value numeric(10, 2) not null default 0,
  outstanding_value numeric(10, 2) not null default 0,
  credit_value numeric(10, 2) not null default 0,
  completed_lessons integer not null default 0,
  future_lessons_cancelled integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists document_issuances (
  id bigserial primary key,
  contract_id integer not null references contratos(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('contract', 'enrollment_declaration')),
  version integer not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  content_hash text not null default '',
  status text not null default 'issued' check (status in ('issued', 'accepted', 'superseded')),
  requires_acceptance boolean not null default false,
  issued_by uuid references profiles(id) on delete set null,
  accepted_by uuid references profiles(id) on delete set null,
  accepted_name text,
  accepted_version integer,
  acceptance_ip text,
  acceptance_user_agent text,
  external_signature_status text not null default 'internal_only' check (
    external_signature_status in (
      'internal_only',
      'pending_external_signature',
      'sent_to_provider',
      'signed_externally'
    )
  ),
  external_signature_notes text,
  external_signature_sent_at timestamptz,
  external_signed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, kind, version)
);

create index if not exists idx_aulas_contrato_id on aulas (contrato_id);
create index if not exists idx_aulas_remarcada_de on aulas (remarcada_de);
create index if not exists idx_contract_cancellations_contract_id on contract_cancellations (contract_id);
create index if not exists idx_contract_cancellations_student_id on contract_cancellations (student_id);
create index if not exists idx_avaliacoes_habilidades_contrato_id on avaliacoes_habilidades (contrato_id);
create index if not exists idx_activity_logs_actor_user_id on activity_logs (actor_user_id);
create index if not exists idx_activity_logs_target_user_id on activity_logs (target_user_id);
create index if not exists idx_activity_logs_contract_id on activity_logs (contract_id);
create index if not exists idx_activity_logs_lesson_id on activity_logs (lesson_id);
create index if not exists idx_activity_logs_payment_id on activity_logs (payment_id);
create index if not exists idx_activity_logs_created_at on activity_logs (created_at desc);
create index if not exists idx_contract_addenda_contract_id on contract_addenda (contract_id, created_at desc);
create index if not exists idx_contract_addenda_created_by on contract_addenda (created_by);
create index if not exists idx_contratos_aluno_id on contratos (aluno_id);
create index if not exists idx_contratos_plano_id on contratos (plano_id);
create index if not exists idx_document_issuances_contract_kind on document_issuances (contract_id, kind, version desc);
create index if not exists idx_document_issuances_issued_by on document_issuances (issued_by);
create index if not exists idx_document_issuances_accepted_by on document_issuances (accepted_by);
create index if not exists idx_document_issuances_student_id on document_issuances (student_id, created_at desc);
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
alter table contract_addenda enable row level security;
alter table document_issuances enable row level security;

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

create or replace function accept_document_issuance(
  p_issuance_id bigint,
  p_student_id uuid,
  p_acceptance_name text,
  p_acceptance_ip text default null,
  p_acceptance_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issuance document_issuances%rowtype;
begin
  select *
  into v_issuance
  from document_issuances
  where id = p_issuance_id
  for update;

  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_issuance.student_id <> p_student_id then
    raise exception 'Sem permissão para aceitar este documento';
  end if;

  if not v_issuance.requires_acceptance then
    raise exception 'Este documento não exige aceite';
  end if;

  if v_issuance.status = 'accepted' then
    return;
  end if;

  update document_issuances
  set status = 'accepted',
      accepted_by = p_student_id,
      accepted_name = coalesce(nullif(trim(p_acceptance_name), ''), accepted_name),
      accepted_version = version,
      acceptance_ip = coalesce(nullif(trim(p_acceptance_ip), ''), acceptance_ip),
      acceptance_user_agent = coalesce(nullif(trim(p_acceptance_user_agent), ''), acceptance_user_agent),
      accepted_at = now()
  where id = p_issuance_id;

  update document_issuances
  set status = 'superseded'
  where contract_id = v_issuance.contract_id
    and kind = v_issuance.kind
    and id <> p_issuance_id
    and status = 'accepted';
end;
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

create policy "contract_addenda_select_policy" on contract_addenda for select using (
  is_professor()
  or contract_id in (
    select c.id
    from contratos c
    where c.aluno_id = (select auth.uid())
  )
);
create policy "contract_addenda_insert_professor_policy" on contract_addenda for insert with check (is_professor());
create policy "contract_addenda_update_professor_policy" on contract_addenda for update using (is_professor()) with check (is_professor());
create policy "contract_addenda_delete_professor_policy" on contract_addenda for delete using (is_professor());

create policy "document_issuances_select_policy" on document_issuances for select using (
  is_professor()
  or student_id = (select auth.uid())
);
create policy "document_issuances_insert_professor_policy" on document_issuances for insert with check (is_professor());
create policy "document_issuances_update_professor_policy" on document_issuances for update using (is_professor()) with check (is_professor());
create policy "document_issuances_delete_professor_policy" on document_issuances for delete using (is_professor());

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

create or replace function renegotiate_contract_balance(
  p_contract_id integer,
  p_actor_user_id uuid,
  p_new_open_value numeric,
  p_new_installments integer,
  p_first_due_date date,
  p_payment_method text,
  p_notes text default null
)
returns table (
  paid_value numeric,
  previous_open_value numeric,
  new_total_value numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract contratos%rowtype;
  v_paid_value numeric(10, 2) := 0;
  v_previous_open_value numeric(10, 2) := 0;
  v_paid_installments integer := 0;
  v_open_installments integer := 0;
  v_due_day integer;
  v_installment_value numeric(10, 2);
  v_remainder numeric(10, 2);
  v_due_date date;
  v_index integer;
begin
  if p_new_open_value is null or p_new_open_value < 0 then
    raise exception 'Novo saldo em aberto inválido';
  end if;

  if p_new_installments is null or p_new_installments < 1 then
    raise exception 'Nova quantidade de parcelas inválida';
  end if;

  if p_first_due_date is null then
    raise exception 'Data da primeira parcela é obrigatória';
  end if;

  select *
  into v_contract
  from contratos
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contrato não encontrado';
  end if;

  select
    coalesce(sum(case when status = 'pago' then valor else 0 end), 0),
    coalesce(sum(case when status <> 'pago' then valor else 0 end), 0),
    count(*) filter (where status = 'pago'),
    count(*) filter (where status <> 'pago')
  into
    v_paid_value,
    v_previous_open_value,
    v_paid_installments,
    v_open_installments
  from pagamentos
  where contrato_id = p_contract_id;

  if v_paid_installments = 0 then
    raise exception 'Renegociação exige ao menos uma parcela paga';
  end if;

  if v_open_installments = 0 then
    raise exception 'Não há parcelas em aberto para renegociar';
  end if;

  v_due_day := extract(day from p_first_due_date);
  v_installment_value := trunc((p_new_open_value / p_new_installments) * 100) / 100;
  v_remainder := round(p_new_open_value - (v_installment_value * p_new_installments), 2);

  insert into contract_addenda (
    contract_id,
    created_by,
    previous_total_value,
    paid_value,
    previous_open_value,
    new_open_value,
    previous_open_installments,
    new_open_installments,
    previous_payment_method,
    new_payment_method,
    previous_due_day,
    new_due_day,
    first_due_date,
    notes
  ) values (
    p_contract_id,
    p_actor_user_id,
    coalesce(v_contract.valor, 0),
    v_paid_value,
    v_previous_open_value,
    p_new_open_value,
    v_open_installments,
    p_new_installments,
    v_contract.forma_pagamento,
    p_payment_method,
    v_contract.dia_vencimento,
    v_due_day,
    p_first_due_date,
    p_notes
  );

  delete from pagamentos
  where contrato_id = p_contract_id
    and status <> 'pago';

  for v_index in 0..(p_new_installments - 1) loop
    v_due_date := (
      date_trunc('month', p_first_due_date::timestamp)
      + make_interval(months => v_index)
    )::date;
    v_due_date := make_date(
      extract(year from v_due_date)::integer,
      extract(month from v_due_date)::integer,
      least(v_due_day, extract(day from (date_trunc('month', v_due_date::timestamp) + interval '1 month - 1 day'))::integer)
    );

    insert into pagamentos (
      contrato_id,
      parcela_num,
      valor,
      data_vencimento,
      forma,
      status
    ) values (
      p_contract_id,
      v_paid_installments + v_index + 1,
      case
        when v_index = p_new_installments - 1 then round(v_installment_value + v_remainder, 2)
        else v_installment_value
      end,
      v_due_date,
      p_payment_method,
      'pendente'
    );
  end loop;

  update contratos
  set valor = round(v_paid_value + p_new_open_value, 2),
      dia_vencimento = v_due_day,
      forma_pagamento = p_payment_method,
      status_financeiro = 'pendente'
  where id = p_contract_id;

  return query
  select
    v_paid_value,
    v_previous_open_value,
    round(v_paid_value + p_new_open_value, 2);
end;
$$;

create or replace function accept_document_issuance(
  p_issuance_id bigint,
  p_student_id uuid,
  p_acceptance_name text,
  p_acceptance_ip text default null,
  p_acceptance_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issuance document_issuances%rowtype;
begin
  select *
  into v_issuance
  from document_issuances
  where id = p_issuance_id
  for update;

  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_issuance.student_id <> p_student_id then
    raise exception 'Sem permissão para aceitar este documento';
  end if;

  if not v_issuance.requires_acceptance then
    raise exception 'Este documento não exige aceite';
  end if;

  if v_issuance.status = 'accepted' then
    return;
  end if;

  update document_issuances
  set status = 'accepted',
      accepted_by = p_student_id,
      accepted_name = coalesce(nullif(trim(p_acceptance_name), ''), accepted_name),
      accepted_version = version,
      acceptance_ip = coalesce(nullif(trim(p_acceptance_ip), ''), acceptance_ip),
      acceptance_user_agent = coalesce(nullif(trim(p_acceptance_user_agent), ''), acceptance_user_agent),
      accepted_at = now()
  where id = p_issuance_id;
end;
$$;

create or replace function accept_document_issuance(
  p_issuance_id bigint,
  p_student_id uuid,
  p_acceptance_name text,
  p_acceptance_ip text default null,
  p_acceptance_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issuance document_issuances%rowtype;
begin
  select *
  into v_issuance
  from document_issuances
  where id = p_issuance_id
  for update;

  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_issuance.student_id <> p_student_id then
    raise exception 'Sem permissão para aceitar este documento';
  end if;

  if not v_issuance.requires_acceptance then
    raise exception 'Este documento não exige aceite';
  end if;

  if v_issuance.status = 'accepted' then
    return;
  end if;

  update document_issuances
  set status = 'accepted',
      accepted_by = p_student_id,
      accepted_name = coalesce(nullif(trim(p_acceptance_name), ''), accepted_name),
      accepted_version = version,
      acceptance_ip = coalesce(nullif(trim(p_acceptance_ip), ''), acceptance_ip),
      acceptance_user_agent = coalesce(nullif(trim(p_acceptance_user_agent), ''), acceptance_user_agent),
      accepted_at = now()
  where id = p_issuance_id;

  update document_issuances
  set status = 'superseded'
  where contract_id = v_issuance.contract_id
    and kind = v_issuance.kind
    and id <> p_issuance_id
    and status = 'accepted';
end;
$$;

