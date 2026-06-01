-- Remove o overload LEGADO de 3 argumentos de accept_document_issuance.
--
-- O banco de produção tinha DUAS sobrecargas:
--   1) accept_document_issuance(bigint, uuid, text)                       <- legado, sem ip/user_agent e sem o passo 'superseded'
--   2) accept_document_issuance(bigint, uuid, text, text, text)          <- atual, usada pela aplicação
--
-- O único call site (app/api/aluno/documentos/aceitar/route.ts) sempre envia
-- p_acceptance_ip e p_acceptance_user_agent, ou seja, sempre resolve para a de 5/6 args.
-- A de 3 args está morta e só gera ambiguidade — este drop remove apenas ela.
-- A assinatura no drop garante que a versão de 6 args NÃO é afetada.

drop function if exists public.accept_document_issuance(bigint, uuid, text);
