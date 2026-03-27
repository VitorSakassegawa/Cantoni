# Como implantar na Vercel (Guia do Professor Gabriel Cantoni)

A Vercel é a plataforma nativa para projetos Next.js, oferecendo a melhor experiência e desempenho. Siga estes passos para colocar seu site no ar:

## 1. Preparar o Repositório

Certifique-se de que seu código está em um repositório Git (GitHub, GitLab ou Bitbucket).

## 2. Iniciar a Implantação na Vercel

1.  Acesse o [Dashboard da Vercel](https://vercel.com/dashboard).
2.  Clique em **"Add New..."** e depois em **"Project"**.
3.  Importe o seu repositório Git.

## 3. Configurar Variáveis de Ambiente

Antes de clicar em "Deploy", você **precisa** adicionar as variáveis de ambiente que estão no seu `.env.local`. 

No painel da Vercel, abra a seção **"Environment Variables"** e adicione:

| Nome da Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sua URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sua Anon Key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sua Service Role Key |
| `GOOGLE_CLIENT_ID` | Seu Google Client ID |
| `GOOGLE_CLIENT_SECRET` | Seu Google Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Seu Google Refresh Token |
| `CRON_SECRET` | Segredo usado pelas rotas internas de cron |
| `MERCADOPAGO_ACCESS_TOKEN` | Seu access token do Mercado Pago |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Sua public key do Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | O segredo do webhook configurado no Mercado Pago |
| `RESEND_API_KEY` | Sua chave da Resend |
| `RESEND_FROM_EMAIL` | Seu e-mail de envio verificado |

> [!IMPORTANT]
> A Vercel detectará automaticamente que o projeto é Next.js e configurará os comandos de build corretamente.

## 4. Atualizar Webhooks (Mercado Pago)

Após o deploy, a Vercel fornecerá uma URL (ex: `https://meu-projeto.vercel.app`). Você deve atualizar o webhook no Mercado Pago:

1.  Vá ao painel do Mercado Pago → Developers.
2.  Atualize a URL do webhook para: `https://sua-url-da-vercel.vercel.app/api/webhooks/mercadopago`

## 5. Configurar Cron Jobs (Opcional)

Se preferir usar o Cron da Vercel em vez do `pg_cron` do Supabase:

1.  Crie um arquivo `vercel.json` na raiz do projeto:

```json
{
  "crons": [
    {
      "path": "/api/cron/lembretes-aula",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/marcar-atrasados",
      "schedule": "0 11 * * *"
    }
  ]
}
```

2.  Lembre-se de configurar `CRON_SECRET` e passar o header `x-cron-secret` se suas APIs de cron exigirem.

---

**Pronto!** Seu site agora estará disponível na URL da Vercel.
