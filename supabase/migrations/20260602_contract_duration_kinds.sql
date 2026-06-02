-- Cardápio de durações: permitir os novos tipos de contrato (mensal→anual),
-- além de semestral/ad-hoc, no CHECK da coluna tipo_contrato.
-- Sem essa alteração, criar um contrato mensal/bimestral/trimestral/anual
-- falharia com violação de constraint.

alter table contratos drop constraint if exists contratos_tipo_contrato_check;

alter table contratos
  add constraint contratos_tipo_contrato_check
  check (tipo_contrato in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'ad-hoc'));
