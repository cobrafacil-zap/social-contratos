import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import { DeleteClientForm } from "../cliente-form";
import { deleteClientAction } from "./actions";

export const metadata: Metadata = { title: "Cliente" };
export const dynamic = "force-dynamic";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  const client = await db.client.findFirst({
    where: { id, companyId: session.companyId, deletedAt: null },
  });

  if (!client) notFound();

  const contracts = await db.contract.findMany({
    where: { companyId: session.companyId, clientId: client.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      value: true,
      createdAt: true,
    },
  });

  const totalValue = contracts.reduce((sum, contract) => {
    const value = contract.value ? Number(contract.value) : 0;
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={client.name}
        description={client.companyName ? `Razão social: ${client.companyName}` : undefined}
        action={
          <Link
            href={`/clientes/${client.id}/editar`}
            className="btn inline-flex"
          >
            Editar
          </Link>
        }
      />

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Contratos" value={contracts.length} hint="Vinculados a este cliente" />
        <Stat label="Valor total" value={formatCurrency(totalValue)} hint="Soma dos contratos" />
        <Stat
          label="Cliente desde"
          value={formatDate(client.createdAt)}
          hint={`Atualizado em ${formatDateTime(client.updatedAt)}`}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados do cliente" />
          <dl className="divide-y divide-paper-line">
            <Row label="Nome" value={client.name} />
            <Row label="Razão social" value={client.companyName} />
            <Row label="Documento (CPF/CNPJ)" value={client.document} />
            <Row label="Cidade / UF" value={[client.city, client.state].filter(Boolean).join(" / ")} />
            <Row label="CEP" value={client.zip} />
            <Row label="Endereço" value={client.address} />
            <Row label="Cadastrado em" value={formatDateTime(client.createdAt)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Contatos" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-sm text-ink-mute">E-mail</p>
              <a
                href={`mailto:${client.email}`}
                className="text-[15px] font-semibold text-cobalt hover:underline"
              >
                {client.email}
              </a>
            </div>
            <div>
              <p className="text-sm text-ink-mute">Telefone</p>
              {client.phone ? (
                <a
                  href={`tel:${client.phone.replace(/\D/g, "")}`}
                  className="text-[15px] font-semibold text-cobalt hover:underline"
                >
                  {client.phone}
                </a>
              ) : (
                <p className="text-[15px] text-ink-mute">Não informado</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Contratos" />
        {contracts.length === 0 ? (
          <EmptyState
            title="Nenhum contrato vinculado"
            description="Os contratos criados para este cliente aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-paper-line">
            {contracts.map((contract) => (
              <li key={contract.id}>
                <Link
                  href={`/contratos/${contract.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{contract.title}</p>
                    <p className="truncate text-sm text-ink-mute">
                      {contract.number} · criado em {formatDate(contract.createdAt)}
                      {contract.value ? ` · ${formatCurrency(contract.value.toString())}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={contract.status} kind="contract" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4">
        <DeleteClientForm
          action={deleteClientAction}
          clientId={client.id}
          clientName={client.name}
          contractCount={contracts.length}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="text-[15px] font-semibold">{value || "—"}</dd>
    </div>
  );
}
