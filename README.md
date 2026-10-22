# Social Sign — plataforma de contratos com assinatura eletrônica

Plataforma de contratos com assinatura eletrônica: o cliente recebe o documento por e-mail, assina direto no navegador
(nome digitado ou assinatura desenhada) e a empresa tem a prova — documento, data, hora, IP, dispositivo e código único.

> 📖 **Guia completo dentro do app:** em `/ajuda` (menu lateral → *Como usar*) tem o passo a passo, mensagens prontas
> para copiar, FAQ e glossário. Este README traz o passo a passo técnico.

## 1. Instalar
```bash
npm install
cp .env.example .env     # preencha as variáveis
```

## 2. Banco (Supabase)
1. Crie o projeto em supabase.com.
2. Em *Project Settings → Database → Connection string* copie a string do **Session pooler** (porta 5432) e use o usuário no formato `postgres.<project-ref>`:
```
DATABASE_URL="postgresql://postgres.<project-ref>:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres?connection_limit=1&pgbouncer=true&pool_timeout=60"
DIRECT_URL="postgresql://postgres.<project-ref>:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres?connection_limit=1&pgbouncer=true&pool_timeout=60"
```
   > **Atenção:** o host direto (`db.<ref>.supabase.co`) é IPv6-only e **não funciona na Vercel**. O Transaction pooler (porta 6543) é incompatível com o Prisma em ambiente serverless. Use sempre o Session pooler na porta 5432 com o tenant no usuário.
   > O `?connection_limit=1` é obrigatório no plano free: o pooler aceita ~15 conexões no total e a Vercel escala em várias instâncias. Sem esse limite o erro é `max clients reached in session mode`.
   > `pgbouncer=true` desliga prepared statements (exigido pelo pooler) e `pool_timeout=60` dá 60s de espera por uma conexão livre.
   > O erro `Timed out fetching a new connection from the connection pool` aparece quando várias queries rodam em paralelo (`Promise.all`) e cada uma segura uma conexão. A correção é **não** aumentar o limite, mas reduzir o paralelismo: a criação de contrato roda numa API route (`src/app/api/contratos/route.ts`) que faz as queries em sequência.
   > O plano free pausa o banco após 1 semana sem uso — restaure pelo painel do Supabase quando isso acontecer (o sintoma é `Can't reach database server`).
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

## 4. E-mail (Resend) — para enviar o contrato ao cliente
1. Crie conta em **resend.com** e verifique o seu domínio (*Domains → Add Domain*).
   O Resend devolve 4 registros DNS — cadastre-os no provedor do domínio:
   - `TXT  resend._domainkey  <chave DKIM>`
   - `MX   send              feedback-smtp.us-east-1.amazonses.com  (prioridade 10)`
   - `TXT  send              v=spf1 include:amazonses.com ~all`
   - `CNAME rsend            send.forge.rmta.net`
   Se o DNS é gerenciado pela Vercel, dá para automatizar:
   ```bash
   vercel dns addseudominio.com resend._domainkey TXT "<chave>"
   vercel dns addseudominio.com send MX "feedback-smtp.us-east-1.amazonses.com" 10
   vercel dns addseudominio.com send TXT "v=spf1 include:amazonses.com ~all"
   vercel dns add pseudominio.com rsend CNAME "send.forge.rmta.net"
   ```
   Além do SPF do subdomínio `send`, publique o **SPF na raiz** — sem ele, quem confere o SPF
   do domínio do remetente (`seudominio.com`) não encontra registro:
   ```bash
   vercel dns add pseudominio.com @ TXT "v=spf1 include:amazonses.com ~all"
   ```
   E publique a política DMARC (comece em `p=none` para observar os relatórios):
   ```
   TXT  _dmarc   v=DMARC1; p=none; rua=mailto:contatocomercialsocial@gmail.com; fo=1; adkim=s; aspf=s; pct=100
   ```
2. Copie a **API key** (*API Keys → Create API Key*).
3. Preencha no `.env` **e** nas variáveis de ambiente do Vercel:
```
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="Social Sign <contratos@seudominio.com>"
EMAIL_REPLY_TO="contato@seudominio.com"
```
4. Para o Gmail entregar na **caixa de entrada** (e não em Spam), o e-mail já sai com:
   - versão em texto puro junto do HTML;
   - `List-Unsubscribe` (HTTPS em `/api/unsubscribe` + `mailto`) com `List-Unsubscribe-Post: One-Click` — exigido pelo Gmail;
   - `Reply-To` apontando para uma caixa real;
   - `X-Entity-Ref-ID` único por contrato.
   Mesmo assim, domínio novo e pouco volume caem no spam com frequência: peça para o
   destinatário marcar "Não é spam" / adicionar o remetente aos contatos e, no Gmail,
   criar um filtro que nunca arquive os e-mails de `contratos@seudominio.com`.
5. Sem essas variáveis o app **continua funcionando**: o link de assinatura aparece na tela para você enviar
   manualmente (por WhatsApp, e-mail ou outro canal). A página *Configurações → Integrações* mostra o status.

## 5. Rodar localmente
```bash
npm run dev    # http://localhost:3000
```

## 6. Deploy (Vercel)
1. Suba o código para o GitHub e importe na Vercel.
2. Cadastre todas as variáveis do `.env.example` em *Settings → Environment Variables* (`APP_URL` = URL final).
3. O build já roda `prisma generate`. Aplique migrations em produção com `npm run db:deploy` e depois `npm run db:guards`.

---

## Passo a passo do processo (do zero ao contrato assinado)

### Passo 1 — Criar a conta da empresa
Abra `/cadastro` e preencha: nome da empresa, seu nome, e-mail e senha (mínimo 12 caracteres).
**Não precisa confirmar e-mail**: a conta é criada e você entra direto no painel.

### Passo 2 — Conferir a empresa
Em `/empresa` você ajusta nome, razão social, CNPJ, **cor primária** (aparece no documento), **prefixo dos contratos**
(ex.: `SOC` → `SOC-2026-0001`) e o responsável. Em `/empresa/equipe` você adiciona Collaboradores e define o papel de cada um.

### Passo 3 — Criar o contrato (sem cadastrar o cliente antes)
Em `/contratos/novo`, o wizard tem 3 passos:

1. **Dados** — nome e **e-mail do cliente**, CPF/CNPJ (opcional), endereço (opcional), título do contrato, modelo,
   valor, data de início/fim e validade do link.
   *Você não precisa criar o cliente antes*: o sistema cria (ou reaproveita, pelo e-mail) o registro do cliente sozinho.
   Se o e-mail já existir na empresa, os dados são completados automaticamente.
2. **Cofre** — escolha em qual cofre guardar o contrato, ou marque **"＋ Criar novo cofre"** e digite o nome na hora.
3. **Variáveis e signatários** — o app detectou as variáveis do modelo escolhido (`{{cliente_nome}}`, `{{valor}}`,
   `{{data_inicio}}`…) e já sugere os valores; você ajusta o que quiser e cadastra os **signatários**
   (nome, e-mail e papel: Contratante, Testemunha…).

### Passo 4 — Enviar para o cliente
Na tela do contrato, em **"Enviar para assinatura"**:

- informe os signatários (nome, e-mail, papel);
- deixe marcado **"Enviar o link por e-mail para cada signatário"**;
- clique em **Enviar para assinatura**.

O que acontece:
- a versão atual do documento é **travada** (não pode mais ser alterada);
- é gerado um **link individual** `/s/<token>` para cada signatário (o token é gravado apenas como hash);
- o cliente **recebe o e-mail** com o link, o nome do documento e a data de validade;
- os links também aparecem na tela, com botão **Copiar** — úteis para mandar por WhatsApp.

> **Importante:** o link em claro só aparece logo após o envio. Se você recarregar a página e perder os links,
> use **"Gerar novos links"** (disponível enquanto ninguém tiver assinado). Os links antigos deixam de funcionar.

### Passo 5 — O cliente assina
O cliente abre o link no celular (não precisa criar conta nem instalar nada) e:
1. lê o documento completo;
2. preenche os campos (nome, CPF, data);
3. assina **digitando o nome** ou **desenhando** no quadro com o dedo/mouse;
4. marca a caixa de concordância e confirma.

Cada assinatura registra **documento, data/hora, IP, user-agent e um código único**. Se ele recusar, é possível
informar o motivo — a empresa recebe a notificação.

### Passo 6 — Acompanhar
- `/assinaturas` — prova de cada assinatura, com IP, código e **certificado imprimível**; exporte em CSV.
- `/notificacoes` — avisos de assinatura, recusa e envio.
- `/contratos` — status de tudo (Rascunho → Enviado → Assinado).
- `/cofre` — documentos guardados, organized por cofre.

### Passo 7 — Configurar
Em `/configuracoes`: preferências (dias padrão de validade, exigir aceite dos termos), diagnóstico das variáveis
de ambiente, logs de atividade e status das integrações (Supabase Storage e Resend).

### Passo 8 — Conta
Em `/conta`: dados do perfil e troca de senha. No **login** há a opção **"Manter conectado por 30 dias"** — sem ela,
a sessão expira em 8 horas.

---

## Módulos implementados
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
