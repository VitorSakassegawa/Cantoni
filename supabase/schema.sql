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
  cefr_level text check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  placement_test_completed boolean not null default false,
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
  semestre text check (semestre in ('jan-jun', 'jul-dez')),
  ano integer not null,
  aulas_totais integer not null,
  aulas_dadas integer not null default 0,
  aulas_restantes integer not null,
  status text not null default 'ativo' check (status in ('ativo', 'vencido', 'cancelado')),
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
  mercadopago_customer_id text,
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
  homework_due_date date,
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
  parcela_num integer check (parcela_num between 1 and 12),
  valor numeric(10, 2) not null,
  data_vencimento date not null,
  data_pagamento date,
  forma text check (forma in ('pix', 'cartao', 'dinheiro', 'boleto', 'credit_card', 'debit_card')),
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
  id serial primary key,
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
  interval integer not null default 1,
  repetitions integer not null default 0,
  ease_factor numeric(4, 2) not null default 2.5,
  next_review timestamptz not null,
  created_at timestamptz not null default now()
);

-- AVALIACOES
create table if not exists avaliacoes_habilidades (
  id serial primary key,
  aluno_id uuid not null references profiles(id) on delete cascade,
  mes_referencia date not null,
  speaking integer not null check (speaking between 0 and 100),
  listening integer not null check (listening between 0 and 100),
  reading integer not null check (reading between 0 and 100),
  writing integer not null check (writing between 0 and 100),
  created_at timestamptz not null default now(),
  unique (aluno_id, mes_referencia)
);

-- PLACEMENT RESULTS
create table if not exists placement_results (
  id serial primary key,
  student_id uuid not null references profiles(id) on delete cascade,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  score integer not null,
  total_questions integer not null,
  answers jsonb not null,
  insights text,
  created_at timestamptz not null default now()
);

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

create or replace function is_professor()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid() and role = 'professor'
  );
$$;

create policy "planos_read_all" on planos for select using (true);

create policy "professor_all_profiles" on profiles for all using (is_professor()) with check (is_professor());
create policy "aluno_own_profile_select" on profiles for select using (auth.uid() = id);
create policy "aluno_own_profile_update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "professor_all_contratos" on contratos for all using (is_professor()) with check (is_professor());
create policy "aluno_own_contratos" on contratos for select using (aluno_id = auth.uid());

create policy "professor_all_aulas" on aulas for all using (is_professor()) with check (is_professor());
create policy "aluno_own_aulas_select" on aulas for select using (
  contrato_id in (select id from contratos where aluno_id = auth.uid())
);

create policy "professor_all_remarcacoes" on remarcacoes_mes for all using (is_professor()) with check (is_professor());
create policy "aluno_own_remarcacoes_select" on remarcacoes_mes for select using (aluno_id = auth.uid());

create policy "professor_all_pagamentos" on pagamentos for all using (is_professor()) with check (is_professor());
create policy "aluno_own_pagamentos_select" on pagamentos for select using (
  contrato_id in (select id from contratos where aluno_id = auth.uid())
);

create policy "recessos_read_all" on recessos for select using (true);
create policy "professor_manage_recessos" on recessos for all using (is_professor()) with check (is_professor());

create policy "professor_all_flashcards" on flashcards for all using (is_professor()) with check (is_professor());
create policy "aluno_own_flashcards" on flashcards for all using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());

create policy "professor_all_avaliacoes" on avaliacoes_habilidades for all using (is_professor()) with check (is_professor());
create policy "aluno_own_avaliacoes_select" on avaliacoes_habilidades for select using (aluno_id = auth.uid());

create policy "professor_all_placement_results" on placement_results for all using (is_professor()) with check (is_professor());
create policy "aluno_own_placement_results" on placement_results for select using (student_id = auth.uid());
create policy "aluno_insert_own_placement_results" on placement_results for insert with check (student_id = auth.uid());

-- ============================================================
-- CONTRACT HELPERS
-- ============================================================

create or replace function atualizar_contagem_aulas()
returns trigger
language plpgsql
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
