import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { ensureDefaultTemplates, templateHtml } from "@/lib/templates";
import { extractVariables } from "@/lib/contract";
import { formatDate } from "@/lib/format";
import { Card, EmptyPage, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Modelos" };
export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export default async function ModelosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, companyId } = await requireUser();

  // Popula a empresa com os modelos padrão apenas quando ela ainda não tem nenhum.
  await ensureDefaultTemplates(companyId, userId);

  const sp = await searchParams;
  const q = firstParam(sp.q);
  const categoria = firstParam(sp.categoria);

  const where: Prisma.ContractTemplateWhereInput = {
    companyId,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(categoria ? { category: categoria } : {}),
  };

  const [templates, categoryRows] = await Promise.all([
    db.contractTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contracts: { where: { deletedAt: null } } } } },
    }),
    db.contractTemplate.findMany({
      where: { companyId, deletedAt: null, category: { not: null } },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    }),
  ]);

  const categories = categoryRows
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c));

  const temFiltro = Boolean(q || categoria);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Modelos"
        description="Modelos de contrato reutilizáveis. As variáveis são preenchidas automaticamente na criação do contrato."
        action={
          <Link href="/modelos/novo" className="btn">
            Novo modelo
          </Link>
        }
      />

      <Card className="mb-5">
        <form method="get" action="/modelos" className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
              Buscar por nome
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ex.: Prestação"
              className="field"
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <label htmlFor="categoria" className="mb-1.5 block text-sm font-semibold">
              Categoria
            </label>
            <select id="categoria" name="categoria" defaultValue={categoria} className="field">
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn">
            Filtrar
          </button>

          {temFiltro && (
            <Link
              href="/modelos"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-card px-4 text-[15px] font-semibold text-ink-soft hover:bg-paper"
            >
              Limpar
            </Link>
          )}
        </form>
      </Card>

      {templates.length === 0 ? (
        <EmptyPage
          title={temFiltro ? "Nenhum modelo encontrado" : "Você ainda não tem modelos"}
          description={
            temFiltro
              ? "Ajuste a busca ou o filtro de categoria para encontrar o modelo desejado."
              : "Crie seu primeiro modelo de contrato para reutilizar em novos contratos."
          }
          action={{ href: "/modelos/novo", label: "Criar modelo" }}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-paper-line">
            {templates.map((t) => {
              const variaveis = extractVariables(templateHtml(t.content)).length;
              return (
                <li key={t.id}>
                  <Link
                    href={`/modelos/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-mute">
                        {t.category ? (
                          <span className="mr-2 inline-flex items-center rounded-md bg-cobalt-tint px-2 py-0.5 text-xs font-semibold text-cobalt">
                            {t.category}
                          </span>
                        ) : (
                          <span className="mr-2 inline-flex items-center rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink-mute">
                            Sem categoria
                          </span>
                        )}
                        {variaveis} {variaveis === 1 ? "variável" : "variáveis"} ·{" "}
                        {t._count.contracts}{" "}
                        {t._count.contracts === 1 ? "contrato usa" : "contratos usam"} este modelo
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-ink-mute">
                      Criado em {formatDate(t.createdAt)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
