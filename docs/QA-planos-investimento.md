# QA — Planos & Investimento (cardápio de durações + fidelidade)

Roteiro de teste manual após o deploy + a aplicação das migrações
(`20260602_pricing_tiers.sql`, `20260602_contract_duration_kinds.sql`,
`20260602_contract_loyalty.sql`).

Valores esperados conforme a escada semeada (semestral 1x = R$1.600).

## A) Tela "Planos & Investimento" (professor)
- [ ] Menu lateral mostra **"Planos & Investimento"**.
- [ ] Preços-padrão: Semestral 1x = **R$1.600** com hint **"R$ 80,00/aula · 11% abaixo do avulso"**; Avulsa = **"Referência (preço por aula)"**.
- [ ] Cardápio de durações (preço-pacote → preço/aula · desconto vs avulso):

| Duração | Pacote 1x | →/aula | Pacote 2x | →/aula |
|---|---|---|---|---|
| Mensal (4/8) | R$352 | R$88 (2%) | R$656 | R$82 (9%) |
| Bimestral (8/16) | R$688 | R$86 (4%) | R$1.264 | R$79 (12%) |
| Trimestral (12/24) | R$1.008 | R$84 (7%) | R$1.824 | R$76 (16%) |
| Semestral (20/40) | R$1.600 | R$80 (11%) | R$2.880 | R$72 (20%) |
| Anual (40/80) | R$3.000 | R$75 (17%) | R$5.440 | R$68 (24%) |

- [ ] Salvar preço **sem justificativa** → bloqueia. Com justificativa → salva e registra no Histórico.
- [ ] Aplicar IPCA sem justificativa → bloqueia; com justificativa → escala também os tiers.

## B) Criação de contrato por duração (professor → aluno → novo contrato)
Plano 1x (Segunda):

| Duração | Aulas | Data fim | Investimento 1x | Parcelas (teto) |
|---|---|---|---|---|
| Mensal | 4 | auto (read-only) | R$352 | 1 |
| Bimestral | 8 | auto | R$688 | 2 |
| Trimestral | 12 | auto | R$1.008 | 3 |
| Semestral | 20 | auto (fim do semestre) | R$1.600 | até 6 |
| Anual | 40 | auto | R$3.000 | até 12 |
| Avulsa | conforme datas | manual | nº aulas × R$90 | flexível |

- [ ] Data de término read-only/auto para todas, exceto avulsa.
- [ ] Seletor de parcelas limitado ao teto da duração.
- [ ] Trimestral começando em maio → permite cruzar jun/jul. Semestral cruzando → bloqueia.
- [ ] Limite de dias por frequência (1x = 1 dia, 2x = 2 dias), exceto avulsa.
- [ ] Salvar 1 contrato real e conferir aulas/valor/parcelas no detalhe do aluno.

## C) Fidelidade
Requer aluno com 1º contrato há mais de 1 ano.
- [ ] Dashboard do aluno: card "Fidelidade" com tempo de casa + % conquistado (até 15%). Aluno < 1 ano: mensagem de incentivo.
- [ ] Novo contrato (professor): aba Valores mostra "Fidelidade −X%: de R$tier por R$comdesconto"; Investimento Final já reduzido.
- [ ] Exemplo: 2 anos (10%) num anual 2x: R$5.440 → R$4.896.
- [ ] Aluno novo (1º contrato): fidelidade = 0%.

## D) Regras / segurança
- [ ] Desconto manual > 0 sem justificativa → bloqueia.
- [ ] Servidor é autoritativo no valor (não confia no `valor` do payload).
- [ ] Contrato salvo guarda `valor_padrao` (tier + fidelidade) e `loyalty_discount_percent`.

## E) Regressão
- [ ] Semestral 1x/2x: 20/40 aulas, fim do semestre, bônus.
- [ ] Avulsa: nº aulas × R$90, data manual.
- [ ] Pagamentos, remarcação e transcrição inalterados.

## Verificação no banco (SQL Editor, service role)
```sql
select id, tipo_contrato, aulas_totais, valor, valor_padrao,
       loyalty_discount_percent, desconto_valor, data_inicio, data_fim
from contratos order by created_at desc limit 5;

select contrato_id, count(*) parcelas, sum(valor) total
from pagamentos
where contrato_id = (select id from contratos order by created_at desc limit 1)
group by contrato_id;
```
