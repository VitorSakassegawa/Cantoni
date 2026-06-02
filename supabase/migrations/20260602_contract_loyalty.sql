-- Fidelidade ("tempo de casa"): registra o % de desconto de fidelidade aplicado
-- ao criar o contrato, para auditoria/transparência. Aplicado apenas a
-- contratos NOVOS (igual ao reajuste IPCA) — nunca a contratos vigentes.

alter table contratos
  add column if not exists loyalty_discount_percent numeric(5, 2) not null default 0;
