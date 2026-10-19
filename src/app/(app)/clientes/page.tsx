import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, EmptyPage, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? "").trim();

  const base: Prisma.ClientWhereInput = {
    companyId: session.companyId,
    deletedAt: null,
  };

  const where: Prisma.ClientWhereInput = query
    ? {
        ...base,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { document: { contains: query, mode: "insensitive" } },
        ],
      }
    : base;

  const [clients, total, withDocument, withEmail] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { contracts: { where: { deletedAt: null } } },
        },
      },
    }),
    db.client.count({ where: base }),
    db.client.count({ where: { ...base, document: { not: null } } }),
    db.client.count({ where: { ...base, email: { not: "" } } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes da sua empresa e os contratos vinculados."
        action={
          <Link href="/clientes/novo" className="btn inline-flex">
            Novo cliente
          </Link>
        }
      />

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total de clientes" value={total} hint="Clientes ativos da empresa" />
        <Stat label="Com documento" value={withDocument} hint="CPF ou CNPJ informado" />
        <Stat label="Com e-mail" value={withEmail} hint="E-mail cadastrado" />
      </dl>

      <form method="get" action="/clientes" className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="sr-only">
            Buscar cliente
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Buscar por nome, e-mail ou documento…"
            className="field"
          />
        </div>
        <button type="submit" className="btn inline-flex">
          Buscar
        </button>
        {query && (
          <Link
            href="/clientes"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-white px-4 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
          >
            Limpar
          </Link>
        )}
      </form>

      {query && (
        <p className="mb-3 text-sm text-ink-mute">
          {clients.length} cliente(s) encontrado(s) para <strong className="text-ink-soft">"{query}"</strong>.
        </p>
      )}

      {clients.length === 0 ? (
        query ? (
          <EmptyPage
            title="Nenhum cliente encontrado"
            description="Ajuste a busca ou cadastre um novo cliente para sua empresa."
            action={{ href: "/clientes/novo", label: "Novo cliente" }}
          />
        ) : (
          <EmptyPage
            title="Nenhum cliente cadastrado"
            description="Cadastre seus clientes para vincular contratos, documentos e assinaturas."
            action={{ href: "/clientes/novo", label: "Cadastrar o primeiro cliente" }}
          />
        )
      ) : (
        <Card>
          <div className="hidden gap-4 border-b border-paper-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-mute lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Telefone</span>
            <span>Cidade / UF</span>
            <span className="text-right">Contratos</span>
          </div>
          <ul className="divide-y divide-paper-line">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clientes/${client.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-paper lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{client.name}</p>
                    <p className="truncate text-sm text-ink-mute">
                      {client.document ?? "Documento não informado"}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-soft lg:mt-0">{client.email}</p>
                  <p className="mt-1 truncate text-sm text-ink-soft lg:mt-0">
                    {client.phone ?? "—"}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink-soft lg:mt-0">
                    {[client.city, client.state].filter(Boolean).join(" / ") || "—"}
                  </p>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-ink-soft lg:mt-0 lg:text-right">
                    {client._count.contracts}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
