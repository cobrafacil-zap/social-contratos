import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FilePlus2, PenLine, Users, Vault } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { ContractStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const SENT: ContractStatus[] = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "SIGNED", "REFUSED", "EXPIRED"];
const WAITING: ContractStatus[] = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED"];

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session!.user.companyId; // toda consulta é filtrada pela empresa da sessão
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const base = { companyId, deletedAt: null };

  const [
    total,
    sent,
    waiting,
    signed,
    expired,
    canceled,
    draft,
    signedMonth,
    recent,
    clients,
    signatureCount,
    unread,
    recentSignatures,
  ] = await Promise.all([
    db.contract.count({ where: base }),
    db.contract.count({ where: { ...base, status: { in: SENT } } }),
    db.contract.count({ where: { ...base, status: { in: WAITING } } }),
    db.contract.count({ where: { ...base, status: "SIGNED" } }),
    db.contract.count({ where: { ...base, status: "EXPIRED" } }),
    db.contract.count({ where: { ...base, status: "CANCELED" } }),
    db.contract.count({ where: { ...base, status: "DRAFT" } }),
    db.contract.count({ where: { ...base, status: "SIGNED", completedAt: { gte: monthStart } } }),
    db.contract.findMany({
      where: base,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        value: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
    db.client.count({ where: { companyId, deletedAt: null } }),
    db.signature.count({ where: { signer: { is: { contract: { is: { companyId } } } } } }),
    db.notification.count({ where: { companyId, readAt: null, OR: [{ userId: null }, { userId: session!.user.id }] } }),
    db.signature.findMany({
      where: { signer: { is: { contract: { is: { companyId } } } } },
      orderBy: { signedAt: "desc" },
      take: 4,
      select: {
        id: true,
        signedAt: true,
        method: true,
        signer: { select: { name: true, contract: { select: { id: true, number: true, title: true } } } },
      },
    }),
  ]);

  const cards = [
    { label: "Total de contratos", value: total },
    { label: "Enviados", value: sent },
    { label: "Aguardando assinatura", value: waiting },
    { label: "Assinados", value: signed },
    { label: "Vencidos", value: expired },
    { label: "Cancelados", value: canceled },
    { label: "Rascunhos", value: draft },
    { label: "Assinados neste mês", value: signedMonth },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-ink-mute">Visão geral dos contratos da sua empresa.</p>
        </div>
        <Link href="/contratos/novo" className="btn inline-flex">
          <FilePlus2 className="h-4 w-4" aria-hidden /> Novo contrato
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-paper-line bg-white p-4">
            <dt className="text-sm text-ink-mute">{c.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-paper-line bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
            <h2 className="text-base font-bold">Contratos recentes</h2>
            <Link href="/contratos" className="inline-flex items-center gap-1 text-sm font-semibold text-cobalt hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold">Nenhum contrato criado ainda</p>
              <p className="mt-1 text-sm text-ink-mute">
                Comece criando um contrato a partir de um modelo em{" "}
                <Link href="/contratos/novo" className="font-semibold text-cobalt hover:underline">
                  Novo contrato
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-paper-line">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <Link href={`/contratos/${c.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.title}</p>
                    <p className="truncate text-sm text-ink-mute">
                      {c.number} · {c.client.name}
                      {c.value !== null && ` · ${formatCurrency(c.value.toString())}`}
                    </p>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-paper-line bg-white p-5">
            <h2 className="mb-4 text-base font-bold">Resumo</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-mute">
                  <Users className="h-4 w-4" /> Clientes
                </dt>
                <dd className="font-bold tabular-nums">{clients}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-mute">
                  <PenLine className="h-4 w-4" /> Assinaturas
                </dt>
                <dd className="font-bold tabular-nums">{signatureCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-mute">
                  <Vault className="h-4 w-4" /> Cofre
                </dt>
                <dd>
                  <Link href="/cofre" className="font-bold text-cobalt hover:underline">
                    Abrir
                  </Link>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-mute">Notificações novas</dt>
                <dd className="font-bold tabular-nums">{unread}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-paper-line bg-white">
            <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
              <h2 className="text-base font-bold">Últimas assinaturas</h2>
              <Link href="/assinaturas" className="inline-flex items-center gap-1 text-sm font-semibold text-cobalt hover:underline">
                Ver <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentSignatures.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-mute">Nenhuma assinatura registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-paper-line">
                {recentSignatures.map((s) => (
                  <li key={s.id} className="px-5 py-3">
                    <p className="truncate text-sm font-semibold">{s.signer.name}</p>
                    <p className="truncate text-xs text-ink-mute">
                      {s.signer.contract.number} · {formatDateTime(s.signedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
