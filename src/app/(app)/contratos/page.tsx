import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import type { ContractStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { CONTRACT_STATUS } from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import { Card, EmptyPage, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Contratos" };
export const dynamic = "force-dynamic";

/** Status que continuam aguardando assinatura. */
const AWAITING_SIGNATURE: ContractStatus[] = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED"];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; clientId?: string }>;
}) {
  const session = await requireUser();
  const { companyId } = session;
  const sp = await searchParams;

  const status = sp.status && CONTRACT_STATUS[sp.status] ? (sp.status as ContractStatus) : undefined;
  const q = (sp.q ?? "").trim();
  const clientId = (sp.clientId ?? "").trim();

  const base: Prisma.ContractWhereInput = { companyId, deletedAt: null };

  const where: Prisma.ContractWhereInput = { ...base };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
    ];
  }
  if (clientId) where.clientId = clientId;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, drafts, awaiting, signed, signedMonth, expired, contracts, clients] = await Promise.all([
    db.contract.count({ where: base }),
    db.contract.count({ where: { ...base, status: "DRAFT" } }),
    db.contract.count({ where: { ...base, status: { in: AWAITING_SIGNATURE } } }),
    db.contract.count({ where: { ...base, status: "SIGNED" } }),
    db.contract.count({ where: { ...base, status: "SIGNED", completedAt: { gte: monthStart } } }),
    db.contract.count({ where: { ...base, status: "EXPIRED" } }),
    db.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    }),
    db.client.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hasFilters = Boolean(status || q || clientId);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contratos"
        description="Gerencie os contratos da sua empresa: rascunhos, envios e assinaturas."
        action={
          <Link href="/contratos/novo" className="btn">
            <Plus className="h-4 w-4" aria-hidden /> Novo contrato
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={total} />
        <Stat label="Rascunhos" value={drafts} />
        <Stat label="Aguardando assinatura" value={awaiting} />
        <Stat label="Assinados" value={signed} />
        <Stat label="Assinados no mês" value={signedMonth} />
        <Stat label="Vencidos" value={expired} />
      </dl>

      <Card className="mt-6">
        <form action="/contratos" method="get" className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
              Buscar
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
                aria-hidden
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Número ou título do contrato"
                className="field pl-9"
              />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label htmlFor="status" className="mb-1.5 block text-sm font-semibold">
              Status
            </label>
            <select id="status" name="status" defaultValue={status ?? ""} className="field">
              <option value="">Todos</option>
              {Object.entries(CONTRACT_STATUS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label htmlFor="clientId" className="mb-1.5 block text-sm font-semibold">
              Cliente
            </label>
            <select id="clientId" name="clientId" defaultValue={clientId} className="field">
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn">
            Filtrar
          </button>
          {hasFilters && (
            <Link
              href="/contratos"
              className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-mute hover:text-ink"
            >
              Limpar
            </Link>
          )}
        </form>
      </Card>

      {contracts.length === 0 ? (
        <div className="mt-6">
          {hasFilters ? (
            <Card>
              <div className="px-5 py-12 text-center">
                <p className="font-semibold">Nenhum contrato encontrado</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">
                  Ajuste os filtros ou limpe a busca para ver todos os contratos da empresa.
                </p>
                <Link
                  href="/contratos"
                  className="mt-5 inline-flex h-11 items-center rounded-lg border border-paper-line px-4 text-sm font-semibold text-ink-soft hover:bg-paper"
                >
                  Limpar filtros
                </Link>
              </div>
            </Card>
          ) : (
            <EmptyPage
              title="Nenhum contrato por aqui"
              description="Crie o primeiro contrato da sua empresa a partir de um modelo pronto."
              action={{ href: "/contratos/novo", label: "Criar contrato" }}
            />
          )}
        </div>
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-mute">
                <th className="px-5 py-3 font-semibold">Número</th>
                <th className="px-5 py-3 font-semibold">Título</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Valor</th>
                <th className="px-5 py-3 font-semibold">Criado em</th>
                <th className="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-line">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-paper/60">
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums">
                    <Link href={`/contratos/${c.id}`} className="hover:text-cobalt">
                      {c.number}
                    </Link>
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-3.5">
                    <Link href={`/contratos/${c.id}`} className="font-medium hover:text-cobalt">
                      {c.title}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3.5 text-ink-soft">
                    {c.client.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} kind="contract" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-ink-soft">
                    {formatCurrency(c.value ? c.value.toString() : null)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <Link
                      href={`/contratos/${c.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline"
                    >
                      <FileText className="h-4 w-4" aria-hidden /> Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
