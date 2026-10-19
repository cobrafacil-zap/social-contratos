import type { Metadata } from "next";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/auth";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { ROLE } from "@/lib/status";
import { PasswordForm, ProfileForm } from "./conta-form";

export const metadata: Metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

/** Encerra a sessão atual e volta para a tela de login. */
async function signOutEverywhere() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function ContaPage() {
  const session = await requireUser();

  const [user, company] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
    }),
    db.company.findUnique({
      where: { id: session.companyId },
      select: { name: true },
    }),
  ]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Minha conta" />
        <Alert tone="error">Não foi possível carregar os seus dados.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Minha conta"
        description="Atualize seus dados de acesso, sua senha e gerencie a sessão."
      />

      <Card className="mb-6">
        <CardHeader title="Dados da conta" />
        <div className="px-5 py-5">
          <ProfileForm
            user={{
              name: user.name,
              email: user.email,
              roleLabel: ROLE[user.role] ?? user.role,
              companyName: company?.name ?? "—",
            }}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Senha" />
        <div className="px-5 py-5">
          <PasswordForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Sessão" />
        <div className="space-y-4 px-5 py-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-paper-line bg-white p-4">
              <dt className="text-sm text-ink-mute">Último acesso</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatDateTime(user.lastLoginAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-paper-line bg-white p-4">
              <dt className="text-sm text-ink-mute">Conta criada em</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatDateTime(user.createdAt)}
              </dd>
            </div>
          </dl>

          <Alert tone="info">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Sessões expiram em 8 horas.
            </span>
            <p className="mt-1">
              Como o app usa sessão sem estado (JWT), não é possível revogar tokens já emitidos em
              outros dispositivos: eles expiram sozinhos. O botão abaixo encerra a sessão atual
              imediatamente.
            </p>
          </Alert>

          <form action={signOutEverywhere}>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-bad px-5 text-[15px] font-semibold text-white transition-colors hover:brightness-95"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sair de todos os lugares
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
