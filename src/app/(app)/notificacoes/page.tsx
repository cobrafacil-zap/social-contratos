import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatDateTime } from "@/lib/format";
import { Card, EmptyPage, PageHeader } from "@/components/ui";
import { markAllRead, markRead } from "./actions";

export const metadata: Metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function NotificacoesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireUser();
  const { companyId, userId } = session;

  const params = await searchParams;
  const filtro = first(params.filtro);
  const onlyUnread = filtro === "nao-lidas";

  const where = {
    companyId,
    // Notificações da empresa (userId nulo) + as do próprio usuário.
    OR: [{ userId }, { userId: null }],
    ...(onlyUnread ? { readAt: null } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.count({
      where: { companyId, OR: [{ userId }, { userId: null }], readAt: null },
    }),
  ]);

  // O modelo Notification guarda apenas o contractId: buscamos os contratos da empresa para montar o link.
  const contractIds = [...new Set(notifications.map((n) => n.contractId).filter((c): c is string => Boolean(c)))];
  const contracts = contractIds.length
    ? await db.contract.findMany({
        where: { id: { in: contractIds }, companyId, deletedAt: null },
        select: { id: true, number: true, title: true },
      })
    : [];
  const contractById = new Map(contracts.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notificações"
        description="Avisos sobre assinaturas, recusas e documentos da sua empresa."
        action={
          unreadCount > 0 ? (
            <form action={markAllRead}>
              <button type="submit" className="btn">
                Marcar todas como lidas
              </button>
            </form>
          ) : undefined
        }
      />

      <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtro de notificações">
        <Link
          href="/notificacoes"
          aria-current={onlyUnread ? undefined : "page"}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold ${
            onlyUnread ? "text-ink-soft hover:bg-paper" : "bg-cobalt-tint text-cobalt"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/notificacoes?filtro=nao-lidas"
          aria-current={onlyUnread ? "page" : undefined}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold ${
            onlyUnread ? "bg-cobalt-tint text-cobalt" : "text-ink-soft hover:bg-paper"
          }`}
        >
          Não lidas
          {unreadCount > 0 && (
            <span className="ml-2 rounded-md bg-cobalt px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Link>
      </nav>

      {notifications.length === 0 ? (
        <EmptyPage
          title={onlyUnread ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
          description={
            onlyUnread
              ? "Você leu todas as notificações. Volte para a lista completa quando quiser."
              : "Avisos sobre assinaturas, recusas e documentos aparecem aqui."
          }
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const isNew = !n.readAt;
            const contract = n.contractId ? contractById.get(n.contractId) : undefined;
            return (
              <li key={n.id}>
                <Card className={isNew ? "border-cobalt/30" : ""}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">{n.title}</h2>
                        {isNew && (
                          <span className="inline-flex shrink-0 rounded-md bg-cobalt-tint px-2 py-0.5 text-xs font-semibold text-cobalt">
                            Nova
                          </span>
                        )}
                      </div>
                      {n.body && <p className="mt-1 text-sm text-ink-soft">{n.body}</p>}
                      <p className="mt-1.5 text-xs text-ink-mute">
                        {formatDateTime(n.createdAt)}
                        {n.readAt ? ` · lida em ${formatDateTime(n.readAt)}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {contract && (
                        <Link
                          href={`/contratos/${contract.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
                        >
                          Ver contrato
                        </Link>
                      )}
                      {isNew && (
                        <form action={markRead}>
                          <input type="hidden" name="id" value={n.id} />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-lg bg-cobalt px-3 text-sm font-semibold text-white hover:bg-cobalt-dark"
                          >
                            Marcar como lida
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
