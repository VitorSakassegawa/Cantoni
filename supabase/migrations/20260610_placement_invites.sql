-- Placement test invites: replaces the bare `placement_test_completed = false`
-- toggle as the professor's manual release mechanism. Each invite is a row with
-- an audit trail (who created it, when it was consumed) and an optional
-- validity window, and is consumed automatically when the student completes a
-- test. The legacy boolean path keeps working for already-released students.

create table if not exists placement_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'used', 'revoked')),
  valid_from timestamptz,
  valid_until timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint placement_invites_window_check check (
    valid_from is null or valid_until is null or valid_from <= valid_until
  )
);

create index if not exists idx_placement_invites_student_status
  on placement_invites (student_id, status);

alter table placement_invites enable row level security;

create policy "placement_invites_select_policy" on placement_invites
  for select using (is_professor() or student_id = (select auth.uid()));

create policy "placement_invites_insert_professor_policy" on placement_invites
  for insert with check (is_professor());

-- Students may only CONSUME their own invites (transition to 'used' when a test
-- is completed); any other status change is professor-only. This prevents a
-- student from reviving a used/revoked invite via a direct API call.
create policy "placement_invites_update_policy" on placement_invites
  for update
  using (is_professor() or student_id = (select auth.uid()))
  with check (is_professor() or (student_id = (select auth.uid()) and status = 'used'));

create policy "placement_invites_delete_professor_policy" on placement_invites
  for delete using (is_professor());
