-- "Planos & Investimento": cardápio de durações (mensal→anual).
-- Semestral e avulsa continuam nas colunas existentes; as NOVAS durações ficam
-- em tier_pricing (jsonb) como preço-pacote por frequência.

alter table pricing_settings
  add column if not exists tier_pricing jsonb;

-- Semente da escada monotônica (decisão de negócio: compromisso maior = menor
-- preço por aula). Só semeia se ainda não houver configuração.
update pricing_settings
set tier_pricing = '{
  "mensal":     {"price1x": 352,  "price2x": 656},
  "bimestral":  {"price1x": 688,  "price2x": 1264},
  "trimestral": {"price1x": 1008, "price2x": 1824},
  "anual":      {"price1x": 3000, "price2x": 5440}
}'::jsonb
where id = true and tier_pricing is null;

-- Corrige a inversão por aula: semestral 1x R$1920 (R$96/aula) -> R$1600
-- (R$80/aula), abaixo do avulso (R$90/aula). Só altera se ainda estiver no
-- valor-padrão antigo, para não sobrescrever um reajuste manual/IPCA já feito.
-- Não afeta contratos vigentes (preço só vale para contratos novos).
update pricing_settings
set price_semestral_1x = 1600
where id = true and price_semestral_1x = 1920;
