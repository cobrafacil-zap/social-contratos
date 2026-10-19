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

## 7. Módulos implementados
| Módulo | Rotas | O que faz |
|--------|-------|-----------|
| Dashboard | `/dashboard` | Métricas de contratos, clientes, assinaturas e notificações |
| Clientes | `/clientes`, `/clientes/novo`, `/clientes/[id]` | Cadastro completo (CPF/CNPJ, endereço, contatos), busca e edição |
| Modelos | `/modelos`, `/modelos/novo`, `/modelos/[id]` | Templates de contrato com variáveis `{{var}}` e preview ao vivo |
| Contratos | `/contratos`, `/contratos/novo`, `/contratos/[id]` | Wizard de criação, versões, signatários e envio para assinatura |
| Cofre | `/cofre`, `/cofre/[vaultId]` | Cofres (criar/definir padrão), guardar contratos e enviar documentos |
| Assinaturas | `/assinaturas`, `/assinaturas/[id]/certificado` | Prova de cada assinatura (IP, dispositivo, hash, código único) e certificado |
| Notificações | `/notificacoes` | Avisos de assinatura, recusa e Envio, com marcação de lidas |
| Empresa | `/empresa`, `/empresa/equipe` | Perfil da empresa, cores, prefixo de contratos e gestão de usuários |
| Conta | `/conta` | Dados do perfil e troca de senha |
| Configurações | `/configuracoes` | Preferências, diagnóstico de variáveis de ambiente, logs de atividade |
| Assinatura pública | `/s/[token]` | Página que o cliente abre para assinar (digitada ou desenhada) ou recusar |

### Fluxo de assinatura
1. Em `/contratos/[id]`, clique em **Enviar para assinatura** e informe os signatários.
2. O app gera um link `/s/<token>` para cada signatário (o token é guardado apenas como hash no banco).
3. O signatário abre o link, preenche os campos, assina (digitando o nome ou desenhando no canvas) e confirma os termos.
4. Cada assinatura registra documento, data/hora, IP, user-agent e um código único verificável.
5. Quando todos assinam, o contrato vira `SIGNED` e a empresa recebe uma notificação.

## Segurança já implementada
- Senhas com scrypt (nativo do Node) e salt por senha; comparação em tempo constante; limite de 5 tentativas/15 min por e-mail
- Sessão JWT em cookie httpOnly (8 h) e revalidação do usuário no banco a cada página
- Headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy
- Toda consulta filtra por `companyId` da sessão
- Auditoria append-only (trigger) com hash encadeado e versões travadas imutáveis (trigger)
- RLS ativado nas tabelas (o app acessa só pelo servidor)
- Tokens de assinatura guardados apenas como hash (HMAC com `TOKEN_PEPPER`)

## Limitações conhecidas
- O rate limit é em memória; em ambiente serverless, troque por Upstash Redis (mesma interface em `src/server/security/rate-limit.ts`).
- O upload de documentos no cofre exige `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; sem elas o cofre funciona apenas com contratos vinculados.
- A assinatura desenhada é guardada como data URL no banco; para produção, mova para o Supabase Storage.
- O plano free do Supabase pausa o banco após 1 semana sem uso — restaure pelo painel quando isso acontecer.

## Próximo
- Módulo 3: PDF real dos contratos (geração e download do PDF assinado)
- Módulo 5: e-mail transacional via Resend (envio do link de assinatura, lembretes, expiração)
- Notificações in-app em tempo real e assinatura em lote
