-- Adds the 'falta' (student no-show) status to aulas. Financially a falta
-- behaves like a late cancellation (consumes 1 credit), but keeping it as a
-- distinct status lets the professor track attendance rate per student.

alter table aulas drop constraint if exists aulas_status_check;
alter table aulas add constraint aulas_status_check check (
  status in (
    'agendada',
    'confirmada',
    'dada',
    'falta',
    'cancelada',
    'remarcada',
    'pendente_remarcacao',
    'pendente_remarcacao_rejeitada'
  )
);
