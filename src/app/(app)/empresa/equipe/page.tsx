import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { ROLE } from "@/lib/status";
import { AddUserForm, UserRoleForm, UserStatusForm } from "./equipe-form";

export const metadata: Metadata = { title: "Equipe" };
export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const session = await requireUser();
  const companyId = session.companyId;

  const [me, users, activeAdmins] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    }),
    db.user.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    db.user.count({ where: { companyId, role: "ADMIN", isActive: true, deletedAt: null } }),
  ]);

  const isAdmin = !!me && me.role === "ADMIN" && me.isActive && !me.deletedAt;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Equipe"
        description="Usuários com acesso aos contratos da sua empresa."
      />

      {!isAdmin && (
        <div className="mb-6">
          <Alert tone="info">
            Você está visualizando a equipe em modo somente leitura. Apenas administradores podem
            alterar papéis, ativar ou desativar usuários e adicionar novos membros.
          </Alert>
        </div>
      )}

      {isAdmin && activeAdmins <= 1 && (
        <div className="mb-6">
          <Alert tone="warn">
            Esta empresa possui apenas um administrador ativo. Promova outro usuário antes de remover
            ou desativar o último administrador.
          </Alert>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader title={`Usuários (${users.length})`} />
        {users.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Convide um colega para começar a usar o Social Sign."
          />
        ) : (
          <ul className="divide-y divide-paper-line">
            {users.map((user) => (
              <li key={user.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{user.name}</p>
                    {user.id === session.userId && (
                      <span className="rounded-md bg-cobalt-tint px-1.5 py-0.5 text-[11px] font-semibold text-cobalt">
                        você
                      </span>
                    )}
                    <span
                      className={
                        user.isActive
                          ? "rounded-md bg-ok-tint px-1.5 py-0.5 text-[11px] font-semibold text-ok"
                          : "rounded-md bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-ink-mute"
                      }
                    >
                      {user.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ink-mute">{user.email}</p>
                  <p className="mt-0.5 text-xs text-ink-mute">
                    Último acesso: {formatDateTime(user.lastLoginAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isAdmin ? (
                    <>
                      <UserRoleForm userId={user.id} role={user.role} />
                      <UserStatusForm
                        userId={user.id}
                        isActive={user.isActive}
                        isSelf={user.id === session.userId}
                      />
                    </>
                  ) : (
                    <span className="rounded-md bg-paper px-2 py-1 text-xs font-semibold text-ink-soft">
                      {ROLE[user.role] ?? user.role}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Adicionar usuário" />
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-ink-mute">
              O usuário é criado imediatamente com a senha definida por você. Copie a senha exibida
              após a criação e envie ao colaborador: o app não dispara e-mails.
            </p>
            <AddUserForm />
          </div>
        </Card>
      )}
    </div>
  );
}
