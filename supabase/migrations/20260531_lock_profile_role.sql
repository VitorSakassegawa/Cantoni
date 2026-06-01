-- Fecha o escalonamento de privilégio: a policy profiles_update_policy permite
-- ao dono da linha (um aluno) atualizar qualquer coluna da própria linha,
-- inclusive `role`. Sem esta trava, um aluno autenticado pode chamar
--   supabase.from('profiles').update({ role: 'professor' }).eq('id', <seu_id>)
-- direto do browser (anon key) e ganhar acesso de professor a TODOS os dados.
--
-- Esta trava só bloqueia a MUDANÇA da coluna `role` quando quem faz a alteração
-- é um usuário autenticado que ainda NÃO é professor. Continua permitindo:
--   - professor alterar papéis (is_professor() = true);
--   - operações server-side com a service role key (auth.uid() é null, RLS é
--     bypassada e o cadastro/admin de alunos segue funcionando);
--   - qualquer update que não toque em `role` (ex.: o aluno editando o próprio nome).

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not is_professor()
  then
    raise exception 'Alteração de papel (role) não permitida' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_profile_role on public.profiles;

create trigger trg_lock_profile_role
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_escalation();
