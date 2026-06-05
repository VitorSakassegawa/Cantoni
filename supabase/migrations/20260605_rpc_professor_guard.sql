-- Defense-in-depth for the contract SECURITY DEFINER RPCs.
--
-- These functions bypass RLS and trust the route to have checked the caller is
-- a professor. This adds an internal guard so a logged-in NON-professor (e.g. an
-- aluno hitting the RPC directly via the anon client) is rejected even if a
-- future route forgets the check.
--
-- The guard is intentionally fail-open for service-role calls: when invoked with
-- the service_role key (webhooks/crons/server-side professor paths) auth.uid()
-- is NULL, so the check is skipped. It only blocks an authenticated user that is
-- not a professor.
--
-- Bodies below are reproduced VERBATIM from production (pg_get_functiondef on
-- 2026-06-05); the only change is the inserted guard right after BEGIN.

-- ============================================================
-- cancel_contract_v1
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_contract_v1(p_contract_id integer, p_student_id uuid, p_cancelled_by uuid, p_effective_date date, p_status_financeiro text, p_reason_code text, p_reason_label text, p_reason_details text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_lesson_action text DEFAULT 'auto_cancel_future'::text, p_outstanding_action text DEFAULT 'keep_open_balance'::text, p_credit_action text DEFAULT 'no_credit'::text, p_paid_amount numeric DEFAULT 0, p_consumed_value numeric DEFAULT 0, p_outstanding_value numeric DEFAULT 0, p_credit_value numeric DEFAULT 0, p_completed_lessons integer DEFAULT 0, p_future_lesson_ids integer[] DEFAULT '{}'::integer[], p_payment_snapshots jsonb DEFAULT '[]'::jsonb, p_payment_ids_to_delete integer[] DEFAULT '{}'::integer[], p_document_title text DEFAULT NULL::text, p_document_payload jsonb DEFAULT '{}'::jsonb, p_document_content_hash text DEFAULT ''::text)
 RETURNS TABLE(cancellation_id bigint, issuance_id bigint, cancelled_future_lessons integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_contract contratos%rowtype;
  v_cancelled_future_lessons integer := 0;
  v_next_version integer;
begin
  if auth.uid() is not null and not is_professor() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select *
  into v_contract
  from contratos
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contrato não encontrado';
  end if;

  if v_contract.status = 'cancelado' then
    raise exception 'Este contrato já foi cancelado';
  end if;

  update contratos
  set status = 'cancelado',
      status_financeiro = p_status_financeiro,
      data_fim = p_effective_date
  where id = p_contract_id;

  if p_lesson_action = 'auto_cancel_future' and coalesce(array_length(p_future_lesson_ids, 1), 0) > 0 then
    update aulas
    set status = 'cancelada',
        justificativa_professor = 'Contrato cancelado',
        motivo_remarcacao = format('Contrato cancelado em %s', p_effective_date)
    where contrato_id = p_contract_id
      and id = any(p_future_lesson_ids);

    get diagnostics v_cancelled_future_lessons = row_count;
  end if;

  insert into contract_cancellations (
    contract_id,
    student_id,
    cancelled_by,
    effective_date,
    reason_code,
    reason_label,
    reason_details,
    notes,
    lesson_action,
    outstanding_action,
    credit_action,
    paid_amount,
    consumed_value,
    outstanding_value,
    credit_value,
    completed_lessons,
    future_lessons_cancelled
  ) values (
    p_contract_id,
    p_student_id,
    p_cancelled_by,
    p_effective_date,
    p_reason_code,
    p_reason_label,
    nullif(trim(coalesce(p_reason_details, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_lesson_action,
    p_outstanding_action,
    p_credit_action,
    coalesce(p_paid_amount, 0),
    coalesce(p_consumed_value, 0),
    coalesce(p_outstanding_value, 0),
    coalesce(p_credit_value, 0),
    coalesce(p_completed_lessons, 0),
    v_cancelled_future_lessons
  )
  returning id into cancellation_id;

  if p_outstanding_action = 'waive_open_balance' and jsonb_typeof(coalesce(p_payment_snapshots, '[]'::jsonb)) = 'array' then
    insert into payment_cancellation_entries (
      contract_cancellation_id,
      contract_id,
      student_id,
      original_payment_id,
      parcela_num,
      original_status,
      original_amount,
      original_due_date,
      original_payment_method,
      cancellation_reason
    )
    select
      cancellation_id,
      p_contract_id,
      p_student_id,
      entry.original_payment_id,
      entry.parcela_num,
      entry.original_status,
      entry.original_amount,
      entry.original_due_date,
      entry.original_payment_method,
      coalesce(entry.cancellation_reason, 'contract_cancellation')
    from jsonb_to_recordset(coalesce(p_payment_snapshots, '[]'::jsonb)) as entry(
      contract_id integer,
      student_id uuid,
      original_payment_id integer,
      parcela_num integer,
      original_status text,
      original_amount numeric,
      original_due_date date,
      original_payment_method text,
      cancellation_reason text
    );

    if coalesce(array_length(p_payment_ids_to_delete, 1), 0) > 0 then
      delete from pagamentos
      where contrato_id = p_contract_id
        and id = any(p_payment_ids_to_delete)
        and status <> 'pago';
    end if;
  end if;

  select coalesce(max(document_issuances.version), 0) + 1
  into v_next_version
  from document_issuances
  where contract_id = p_contract_id
    and kind = 'cancellation_notice';

  update document_issuances
  set status = 'superseded'
  where contract_id = p_contract_id
    and kind = 'cancellation_notice'
    and status = 'issued';

  insert into document_issuances (
    contract_id,
    student_id,
    kind,
    version,
    title,
    payload,
    content_hash,
    status,
    requires_acceptance,
    issued_by
  ) values (
    p_contract_id,
    p_student_id,
    'cancellation_notice',
    v_next_version,
    coalesce(p_document_title, format('Encerramento contratual #%s', p_contract_id)),
    coalesce(p_document_payload, '{}'::jsonb),
    coalesce(p_document_content_hash, ''),
    'issued',
    false,
    p_cancelled_by
  )
  returning id into issuance_id;

  cancelled_future_lessons := v_cancelled_future_lessons;
  return next;
end;
$function$;

-- ============================================================
-- renegotiate_contract_balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.renegotiate_contract_balance(p_contract_id integer, p_actor_user_id uuid, p_new_open_value numeric, p_new_installments integer, p_first_due_date date, p_payment_method text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(paid_value numeric, previous_open_value numeric, new_total_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_contract public.contratos%rowtype;
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
  if auth.uid() is not null and not is_professor() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

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
  from public.contratos
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
  from public.pagamentos
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

  insert into public.contract_addenda (
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

  delete from public.pagamentos
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

    insert into public.pagamentos (
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

  update public.contratos
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
$function$;

-- ============================================================
-- update_contract_and_pending_payments_v1
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_contract_and_pending_payments_v1(p_contract_id integer, p_plano_id integer, p_data_inicio date, p_data_fim date, p_semestre text, p_ano integer, p_livro_atual text, p_nivel_atual text, p_horario text, p_valor numeric, p_dia_vencimento integer, p_forma_pagamento text, p_status text, p_tipo_contrato text, p_dias_da_semana integer[], p_desconto_valor numeric, p_desconto_percentual numeric, p_payment_updates jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_contract contratos%rowtype;
  v_payment_update record;
begin
  if auth.uid() is not null and not is_professor() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select *
  into v_contract
  from contratos
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contrato não encontrado';
  end if;

  update contratos
  set plano_id = p_plano_id,
      data_inicio = p_data_inicio,
      data_fim = p_data_fim,
      semestre = p_semestre,
      ano = p_ano,
      livro_atual = p_livro_atual,
      nivel_atual = p_nivel_atual,
      horario = p_horario,
      valor = p_valor,
      dia_vencimento = p_dia_vencimento,
      forma_pagamento = p_forma_pagamento,
      status = p_status,
      tipo_contrato = p_tipo_contrato,
      dias_da_semana = p_dias_da_semana,
      desconto_valor = coalesce(p_desconto_valor, 0),
      desconto_percentual = coalesce(p_desconto_percentual, 0)
  where id = p_contract_id;

  for v_payment_update in
    select *
    from jsonb_to_recordset(coalesce(p_payment_updates, '[]'::jsonb)) as entry(
      id integer,
      valor numeric,
      forma text,
      data_vencimento date
    )
  loop
    update pagamentos
    set valor = v_payment_update.valor,
        forma = v_payment_update.forma,
        data_vencimento = v_payment_update.data_vencimento
    where id = v_payment_update.id
      and contrato_id = p_contract_id
      and status <> 'pago';

    if not found then
      raise exception 'Pagamento pendente não encontrado para atualização: %', v_payment_update.id;
    end if;
  end loop;
end;
$function$;
