import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/server/db";
import type { ContractStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const SENT: ContractStatus[] = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "SIGNED", "REFUSED", "EXPIRED"];
const WAITING: ContractStatus[] = ["SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED"];

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session!.user.companyId; // toda consulta é filtrada pela empresa da sessão
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const base = { companyId, deletedAt: null };

  const [total, sent, waiting, signed, expired, canceled, draft, signedMonth, recent] = await Promise.all([
    db.contract.count({ where: base }),
    db.contract.count({ where: { ...base, status: { in: SENT } } }),
    db.contract.count({ where: { ...base, status: { in: WAITING } } }),
    db.contract.count({ where: { ...base, status: "SIGNED" } }),
    db.contract.count({ where: { ...base, status: "EXPIRED" } }),
    db.contract.count({ where: { ...base, status: "CANCELED" } }),
    db.contract.count({ where: { ...base, status: "DRAFT" } }),
    db.contract.count({ where: { ...base, status: "SIGNED", completedAt: { gte: monthStart } } }),
    db.contract.findMany({ where: base, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, number: true, title: true, status: true, client: { select: { name: true } } } }),
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
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
      <p className="mb-6 mt-1 text-ink-mute">Visão geral dos contratos da sua empresa.</p>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-paper-line bg-white p-4">
            <dt className="text-sm text-ink-mute">{c.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 rounded-xl border border-paper-line bg-white">
        <h2 className="border-b border-paper-line px-5 py-4 text-base font-bold">Contratos recentes</h2>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">Nenhum contrato criado ainda</p>
            <p className="mt-1 text-sm text-ink-mute">A criação de contratos chega no Módulo 3. Os números acima já refletem o banco de dados.</p>
          </div>
        ) : (
          <ul className="divide-y divide-paper-line">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="truncate text-sm text-ink-mute">{c.number} · {c.client.name}</p>
                </div>
                <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-xs font-semibold text-ink-soft">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
