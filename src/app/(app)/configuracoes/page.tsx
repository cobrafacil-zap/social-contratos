import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { ROLE } from "@/lib/status";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "geral", label: "Geral" },
  { id: "seguranca", label: "Segurança" },
  { id: "usuarios", label: "Usuários e permissões" },
  { id: "logs", label: "Logs de atividade" },
  { id: "integracoes", label: "Integrações" },
];

const ENV_VARS = [
  {
    key: "AUTH_SECRET",
    description: "Segredo usado para assinar os tokens de sessão (JWT).",
  },
  {
    key: "DATABASE_URL",
    description: "String de conexão com o banco de dados PostgreSQL.",
  },
  {
    key: "DIRECT_URL",
    description: "Conexão direta com o banco, usada pelas migrações do Prisma.",
  },
  {
    key: "SUPABASE_URL",
    description: "URL do projeto Supabase, usada no armazenamento de arquivos.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Chave privileged do Supabase Storage. Nunca exponha no navegador.",
  },
  {
    key: "RESEND_API_KEY",
    description: "Chave da API do Resend usada no envio de e-mails.",
  },
  {
    key: "TOKEN_PEPPER",
    description: "Segredo adicional usado no hash dos tokens de assinatura.",
  },
  {
    key: "CRON_SECRET",
    description: "Protege as rotas de cron (lembretes e expiração de contratos).",
  },
] as const;

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  COMPANY_CREATED: "Empresa criada",
  COMPANY_UPDATED: "Empresa atualizada",
  USER_CREATED: "Usuário criado",
  USER_ROLE_CHANGED: "Papel do usuário alterado",
  USER_STATUS_CHANGED: "Status do usuário alterado",
  PROFILE_UPDATED: "Perfil atualizado",
  PASSWORD_CHANGED: "Senha alterada",
  SETTINGS_UPDATED: "Preferências atualizadas",
};

/** Verifica apenas se a variável existe — o valor nunca é exibido. */
function isEnvConfigured(key: (typeof ENV_VARS)[number]["key"]): boolean {
  switch (key) {
    case "AUTH_SECRET":
      return Boolean(process.env.AUTH_SECRET);
    case "DATABASE_URL":
      return Boolean(process.env.DATABASE_URL);
    case "DIRECT_URL":
      return Boolean(process.env.DIRECT_URL);
    case "SUPABASE_URL":
      return Boolean(process.env.SUPABASE_URL);
    case "SUPABASE_SERVICE_ROLE_KEY":
      return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    case "RESEND_API_KEY":
      return Boolean(process.env.RESEND_API_KEY);
    case "TOKEN_PEPPER":
      return Boolean(process.env.TOKEN_PEPPER);
    case "CRON_SECRET":
      return Boolean(process.env.CRON_SECRET);
    default:
      return false;
  }
}

function readSettings(value: Prisma.JsonValue | null) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    defaultValidityDays:
      typeof raw.defaultValidityDays === "number" ? raw.defaultValidityDays : 30,
    notifyClientByEmail:
      typeof raw.notifyClientByEmail === "boolean" ? raw.notifyClientByEmail : false,
    requireTermsAcceptance:
      typeof raw.requireTermsAcceptance === "boolean" ? raw.requireTermsAcceptance : true,
    accentColor: typeof raw.accentColor === "string" ? raw.accentColor : "#2F4BFF",
  };
}

function actionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export default async function ConfiguracoesPage() {
  const session = await requireUser();
  const companyId = session.companyId;

  const [company, users, logs] = await Promise.all([
    db.company.findUnique({ where: { id: companyId }, select: { settings: true } }),
    db.user.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, role: true, isActive: true },
    }),
    db.activityLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, entity: true, entityId: true, userId: true, createdAt: true },
    }),
  ]);

  const settings = readSettings(company?.settings ?? null);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const roleCounts = Object.keys(ROLE).map((role) => ({
    role,
    label: ROLE[role],
    total: users.filter((u) => u.role === role).length,
    active: users.filter((u) => u.role === role && u.isActive).length,
  }));

  const missingCore = !isEnvConfigured("AUTH_SECRET") || !isEnvConfigured("DATABASE_URL");
  const supabaseReady = isEnvConfigured("SUPABASE_URL") && isEnvConfigured("SUPABASE_SERVICE_ROLE_KEY");
  const resendReady = isEnvConfigured("RESEND_API_KEY");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Configurações"
        description="Preferências da empresa, segurança, permissões e integrações."
      />

      <nav aria-label="Seções das configurações" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="inline-flex h-9 items-center rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="geral" className="mb-6 scroll-mt-24">
        <Card>
          <CardHeader title="Geral" />
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-ink-mute">
              Preferências salvas na empresa e aplicadas aos novos contratos.
            </p>
            <ConfigForm settings={settings} />
          </div>
        </Card>
      </section>

      <section id="seguranca" className="mb-6 scroll-mt-24">
        <Card>
          <CardHeader
            title="Segurança"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Variáveis do ambiente
              </span>
            }
          />
          <div className="space-y-4 px-5 py-5">
            {missingCore && (
              <Alert tone="warn">
                <p className="font-semibold">O app não funcionará corretamente.</p>
                <p className="mt-1">
                  As variáveis <code className="font-mono">AUTH_SECRET</code> e/ou{" "}
                  <code className="font-mono">DATABASE_URL</code> não estão definidas. Configure-as
                  no arquivo <code className="font-mono">.env</code> (localmente) ou nas variáveis de
                  ambiente da Vercel antes de usar o sistema.
                </p>
              </Alert>
            )}

            <ul className="divide-y divide-paper-line rounded-xl border border-paper-line">
              {ENV_VARS.map((env) => {
                const configured = isEnvConfigured(env.key);
                return (
                  <li
                    key={env.key}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{env.key}</p>
                      <p className="text-xs text-ink-mute">{env.description}</p>
                    </div>
                    <span
                      className={
                        configured
                          ? "shrink-0 rounded-md bg-ok-tint px-2 py-1 text-xs font-semibold text-ok"
                          : "shrink-0 rounded-md bg-bad-tint px-2 py-1 text-xs font-semibold text-bad"
                      }
                    >
                      {configured ? "Configurada" : "Não configurada"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="text-xs text-ink-mute">
              Por segurança, o valor das variáveis nunca é exibido — apenas se estão definidas.
            </p>
          </div>
        </Card>
      </section>

      <section id="usuarios" className="mb-6 scroll-mt-24">
        <Card>
          <CardHeader title="Usuários e permissões" />
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-ink-mute">
              Os papéis definem o que cada pessoa pode fazer no Social Sign. A gestão de usuários fica
              na página da equipe.
            </p>

            <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {roleCounts.map((item) => (
                <div key={item.role} className="rounded-xl border border-paper-line bg-card p-4">
                  <dt className="text-sm text-ink-mute">{item.label}</dt>
                  <dd className="mt-1 text-2xl font-extrabold tabular-nums">{item.total}</dd>
                  <p className="mt-0.5 text-xs text-ink-mute">{item.active} ativo(s)</p>
                </div>
              ))}
            </dl>

            <Link
              href="/empresa/equipe"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-cobalt px-5 text-[15px] font-semibold text-white transition-colors hover:bg-cobalt-dark"
            >
              Gerenciar equipe
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Card>
      </section>

      <section id="logs" className="mb-6 scroll-mt-24">
        <Card>
          <CardHeader title="Logs de atividade" />
          {logs.length === 0 ? (
            <EmptyState
              title="Nenhum registro de atividade"
              description="As ações realizadas na empresa aparecerão aqui."
            />
          ) : (
            <ul className="divide-y divide-paper-line">
              {logs.map((log) => {
                const user = log.userId ? usersById.get(log.userId) : undefined;
                return (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{actionLabel(log.action)}</p>
                      <p className="truncate text-xs text-ink-mute">
                        {log.entity}
                        {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                        {user ? ` · ${user.name}` : " · sistema"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-ink-mute">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section id="integracoes" className="scroll-mt-24">
        <Card>
          <CardHeader title="Integrações" />
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
            <div className="rounded-xl border border-paper-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Supabase Storage</p>
                  <p className="mt-1 text-sm text-ink-mute">
                    Armazenamento dos PDFs, anexos e certificados de assinatura.
                  </p>
                </div>
                <span
                  className={
                    supabaseReady
                      ? "shrink-0 rounded-md bg-ok-tint px-2 py-1 text-xs font-semibold text-ok"
                      : "shrink-0 rounded-md bg-warn-tint px-2 py-1 text-xs font-semibold text-warn"
                  }
                >
                  {supabaseReady ? "Ativo" : "Pendente"}
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-mute">
                Configure <code className="font-mono">SUPABASE_URL</code> e{" "}
                <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> no{" "}
                <code className="font-mono">.env</code> local ou nas variáveis da Vercel.
              </p>
              <a
                href="https://supabase.com/docs/guides/storage"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cobalt hover:underline"
              >
                Ver documentação
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>

            <div className="rounded-xl border border-paper-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Resend (e-mail)</p>
                  <p className="mt-1 text-sm text-ink-mute">
                    Envio dos e-mails de convite, envio e cobrança de contratos.
                  </p>
                </div>
                <span
                  className={
                    resendReady
                      ? "shrink-0 rounded-md bg-ok-tint px-2 py-1 text-xs font-semibold text-ok"
                      : "shrink-0 rounded-md bg-warn-tint px-2 py-1 text-xs font-semibold text-warn"
                  }
                >
                  {resendReady ? "Ativo" : "Pendente"}
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-mute">
                Configure <code className="font-mono">RESEND_API_KEY</code> e{" "}
                <code className="font-mono">EMAIL_FROM</code> no{" "}
                <code className="font-mono">.env</code> local ou nas variáveis da Vercel.
              </p>
              <a
                href="https://resend.com/docs"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cobalt hover:underline"
              >
                Ver documentação
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
