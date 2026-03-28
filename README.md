# Cantoni

Plataforma de operacao para aulas particulares de ingles, com portal do professor, portal do aluno, contratos, pagamentos, PIX via Mercado Pago, documentos, integracao com Google Calendar/Meet e automacoes de resumo, homework e flashcards.

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- Mercado Pago
- Google APIs
- Resend

## Principais funcionalidades

- gestao de alunos, aulas, contratos e pagamentos
- area do aluno com calendario, jornada, documentos e historico
- emissao de contratos, declaracoes e aditivos
- cobranca por PIX com webhook de conciliacao
- importacao de transcript do Google Meet
- geracao de resumo da aula, homework e flashcards
- alertas e operacoes manuais para o professor

## Desenvolvimento local

Instale as dependencias:

```bash
npm install
```

Inicie o ambiente local:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variaveis de ambiente

O build falha cedo se variaveis criticas estiverem ausentes. No minimo, configure:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
CPF_ENCRYPTION_KEY=
```

Tambem sao esperadas, conforme os modulos habilitados:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
CRON_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Notas:

- `CPF_ENCRYPTION_KEY` e obrigatoria para ler e gravar CPF com criptografia em repouso.
- `NEXT_PUBLIC_*` precisa existir no deploy antes do build.
- depois de alterar env publica na Vercel, faca redeploy.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm test
npx eslint app lib components tests --ext .ts,.tsx,.mts
```

## Testes

O projeto possui testes focados nos fluxos mais sensiveis:

- pagamentos e status Mercado Pago
- creditos e contratos
- seguranca de auth e cron
- criptografia de CPF
- fallback de env publica do Supabase no browser
- guard para impedir novas paginas client-side com uso inseguro do Supabase browser client
- transcript, flashcards e homework storage

Para rodar tudo:

```bash
npm test
```

## Cron e operacao

Configuracao atual:

- Vercel: apenas `/api/cron/marcar-atrasados`
- professor: lembretes e operacoes manuais em `/professor/cron`
- transcript do Google Meet: pode ser executada manualmente no painel do professor e, se desejado, por scheduler externo

### Vercel Hobby

No plano Hobby:

- cron automatico so pode rodar uma vez por dia
- a execucao nao tem precisao fina dentro da hora agendada

Por isso, lembretes de aula e polling frequente de transcript nao devem ficar no `vercel.json`.

## Deploy

O deploy principal roda na Vercel.

Passos recomendados:

1. configurar todas as env vars em `Production`
2. configurar o webhook do Mercado Pago para `/api/webhooks/mercadopago`
3. fazer redeploy sempre que alterar `NEXT_PUBLIC_*`
4. validar login, PIX, documentos e importacao de transcript em producao

Guias complementares:

- [Vercel deploy](./VERCEL_DEPLOY.md)
- [Operations](./OPERATIONS.md)
- [RLS notes](./supabase/RLS.md)

## Observacoes operacionais

- CPFs sao armazenados criptografados no banco.
- O login e a redefinicao de senha foram movidos para rotas server-side para reduzir dependencia do browser client do Supabase.
- O helper de Supabase no browser possui fallback injetado pelo `app/layout.tsx`, e isso e protegido por testes para evitar regressao.
