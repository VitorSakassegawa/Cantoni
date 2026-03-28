create table if not exists public.auth_rate_limits (
  scope text not null,
  identifier text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (scope, identifier)
);

create index if not exists idx_auth_rate_limits_last_attempt_at
  on public.auth_rate_limits (last_attempt_at desc);

alter table public.auth_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  attempts integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window interval := make_interval(secs => greatest(p_window_seconds, 1));
  v_row auth_rate_limits%rowtype;
begin
  if p_scope is null or p_identifier is null then
    return query select false, 0, 0;
    return;
  end if;

  insert into auth_rate_limits as rl (
    scope,
    identifier,
    attempt_count,
    window_started_at,
    last_attempt_at
  )
  values (p_scope, p_identifier, 1, v_now, v_now)
  on conflict (scope, identifier) do update
  set attempt_count = case
        when rl.window_started_at <= v_now - v_window then 1
        when rl.attempt_count < p_max_attempts then rl.attempt_count + 1
        else rl.attempt_count
      end,
      window_started_at = case
        when rl.window_started_at <= v_now - v_window then v_now
        else rl.window_started_at
      end,
      last_attempt_at = v_now
  returning *
  into v_row;

  if v_row.window_started_at <= v_now - v_window then
    return query select true, 1, 0;
    return;
  end if;

  if v_row.attempt_count > p_max_attempts then
    v_row.attempt_count := p_max_attempts;
  end if;

  if v_row.attempt_count < p_max_attempts then
    return query select true, v_row.attempt_count, 0;
    return;
  end if;

  if v_row.attempt_count = 1 and p_max_attempts = 1 then
    return query select true, v_row.attempt_count, 0;
    return;
  end if;

  if v_row.last_attempt_at = v_now and v_row.attempt_count = p_max_attempts then
    if v_row.window_started_at = v_now then
      return query select true, v_row.attempt_count, 0;
      return;
    end if;
  end if;

  if v_row.attempt_count >= p_max_attempts and v_row.window_started_at > v_now - v_window then
    if v_row.last_attempt_at = v_now and v_row.attempt_count = p_max_attempts then
      return query select true, v_row.attempt_count, 0;
      return;
    end if;

    return query
      select
        false,
        v_row.attempt_count,
        greatest(0, ceil(extract(epoch from ((v_row.window_started_at + v_window) - v_now)))::integer);
    return;
  end if;

  return query select true, v_row.attempt_count, 0;
end;
$$;

alter table public.aulas
  rename column homework_notificado to reminder_sent;
