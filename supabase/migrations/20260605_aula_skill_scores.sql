-- AI-estimated per-skill scores derived from each lesson's transcript.
-- Separate from avaliacoes_habilidades (the professor's MONTHLY manual eval) so
-- the AI estimates complement — never overwrite — the teacher's assessment.
-- Skills are NULLABLE: the AI only scores what it actually observed in the
-- lesson (a conversation class rarely shows reading/writing), so it never
-- fabricates a number.

create table if not exists aula_skill_scores (
  id uuid primary key default gen_random_uuid(),
  aula_id integer not null references aulas(id) on delete cascade,
  aluno_id uuid not null references profiles(id) on delete cascade,
  speaking integer check (speaking between 1 and 10),
  listening integer check (listening between 1 and 10),
  reading integer check (reading between 1 and 10),
  writing integer check (writing between 1 and 10),
  created_at timestamptz not null default now(),
  unique (aula_id)
);

create index if not exists idx_aula_skill_scores_aluno_id on aula_skill_scores (aluno_id);

alter table aula_skill_scores enable row level security;

create policy "aula_skill_scores_select_policy" on aula_skill_scores
  for select using (is_professor() or aluno_id = (select auth.uid()));
create policy "aula_skill_scores_insert_professor_policy" on aula_skill_scores
  for insert with check (is_professor());
create policy "aula_skill_scores_update_professor_policy" on aula_skill_scores
  for update using (is_professor()) with check (is_professor());
create policy "aula_skill_scores_delete_professor_policy" on aula_skill_scores
  for delete using (is_professor());
