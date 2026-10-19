# Social Sign — Módulo 0 (fundação)

Plataforma de contratos com assinatura eletrônica. Este módulo entrega: projeto Next.js 15, schema completo do banco,
login seguro, layout responsivo e dashboard com dados reais do banco.

## 1. Instalar
```bash
npm install
cp .env.example .env     # preencha as variáveis
```

## 2. Banco (Supabase)
1. Crie o projeto em supabase.com.
2. Em *Project Settings → Database → Connection string* copie a string do **Session pooler** (porta 5432) e use o usuário no formato `postgres.<project-ref>`:
```
DATABASE_URL="postgresql://postgres.<project-ref>:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.<project-ref>:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres"
```
   > **Atenção:** o host direto (`db.<ref>.supabase.co`) é IPv6-only e **não funciona na Vercel**. O Transaction pooler (porta 6543) é incompatível com o Prisma em ambiente serverless. Use sempre o Session pooler na porta 5432 com o tenant no usuário.
3. Gere o `AUTH_SECRET`: `openssl rand -base64 32`. Gere também `TOKEN_PEPPER` e `CRON_SECRET`: `openssl rand -hex 32`.
4. Crie as tabelas e aplique as proteções:
```bash
npx prisma migrate dev --name init   # cria prisma/migrations e as tabelas
npm run db:guards                    # trigger append-only da auditoria, trava de versões e RLS
```
   > Se a migration falhar com `no tenant identifier provided`, a string de conexão está sem o tenant (`postgres.` antes do project-ref). Corrija e rode novamente.
5. Crie o primeiro administrador (preencha `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, mínimo 12 caracteres):
```bash
npm run db:seed
```
Depois do seed, remova a senha do `.env`.

## 3. Storage (usado a partir do Módulo 3)
No Supabase: *Storage → New bucket* chamado `contracts`, **privado** (não marque Public).
Preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. A service role key só é usada no servidor — nunca a exponha no frontend.

## 4. E-mail (usado a partir do Módulo 5)
Crie conta no Resend, verifique seu domínio e preencha `RESEND_API_KEY` e `EMAIL_FROM`.

## 5. Rodar localmente
```bash
npm run dev    # http://localhost:3000
```

## 6. Deploy (Vercel)
1. Suba o código para o GitHub e importe na Vercel.
2. Cadastre todas as variáveis do `.env.example` em *Settings → Environment Variables* (`APP_URL` = URL final).
3. O build já roda `prisma generate`. Aplique migrations em produção com `npm run db:deploy` e depois `npm run db:guards`.

## Segurança já implementada
- Senhas com Argon2id; comparação em tempo constante; limite de 5 tentativas/15 min por e-mail
- Sessão JWT em cookie httpOnly (8 h) e revalidação do usuário no banco a cada página
- Headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy
- Toda consulta filtra por `companyId` da sessão
- Auditoria append-only (trigger) e versões travadas imutáveis (trigger)
- RLS ativado nas tabelas (o app acessa só pelo servidor)

## Limitações conhecidas deste módulo
- O rate limit é em memória; em ambiente serverless, troque por Upstash Redis (mesma interface em `src/server/security/rate-limit.ts`).
- Os itens do menu sem módulo pronto aparecem desabilitados ("em breve"), sem links quebrados.
- Não consegui executar `prisma generate`, a migration nem o build no meu ambiente (sem acesso ao servidor de binários do Prisma). O código passou na checagem de tipos, exceto pelos tipos que dependem do client gerado. Se algo falhar no seu primeiro `npm run build`, me envie o erro.

## Próximo: Módulo 1 — Empresa e Clientes
