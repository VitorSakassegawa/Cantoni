-- Atividades: repositório de exercícios do professor (gerados por IA, manuais
-- ou importados de PDF) + atribuições por aluno com correção server-side.
--
-- Segurança do gabarito: a tabela `atividades` guarda as respostas dentro do
-- jsonb `questoes`, então ALUNOS NÃO TÊM SELECT nela. O aluno recebe as
-- questões SANITIZADAS (sem resposta) via server action, e a correção acontece
-- no servidor — mesmo modelo do placement test.

create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  nivel text check (nivel in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  tipo_fonte text not null default 'ia' check (tipo_fonte in ('ia', 'manual', 'pdf')),
  questoes jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists atividade_atribuicoes (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references atividades(id) on delete cascade,
  aluno_id uuid not null references profiles(id) on delete cascade,
  due_date date,
  status text not null default 'pendente' check (status in ('pendente', 'entregue', 'corrigida')),
  respostas jsonb,
  acertos integer,
  total_objetivas integer,
  nota numeric(5, 2),
  feedback text,
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz
);

create index if not exists idx_atividade_atribuicoes_aluno on atividade_atribuicoes (aluno_id, status);
create index if not exists idx_atividade_atribuicoes_atividade on atividade_atribuicoes (atividade_id);

alter table atividades enable row level security;
alter table atividade_atribuicoes enable row level security;

-- Professor gerencia o repositório; aluno NUNCA lê a tabela com gabarito.
create policy "atividades_professor_all" on atividades
  for all using (is_professor()) with check (is_professor());

-- Atribuições: aluno vê as próprias (sem gabarito — a tabela não o contém);
-- mutações de aluno passam pelo service role nas server actions, então não há
-- política de update para aluno (impede forjar nota/acertos via API direta).
create policy "atribuicoes_select_policy" on atividade_atribuicoes
  for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "atribuicoes_professor_insert" on atividade_atribuicoes
  for insert with check (is_professor());
create policy "atribuicoes_professor_update" on atividade_atribuicoes
  for update using (is_professor()) with check (is_professor());
create policy "atribuicoes_professor_delete" on atividade_atribuicoes
  for delete using (is_professor());
