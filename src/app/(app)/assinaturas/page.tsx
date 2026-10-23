import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatDateTime } from "@/lib/format";
import { FIELD_TYPE } from "@/lib/status";
import { Card, CardHeader, EmptyPage, PageHeader, Select, Stat } from "@/components/ui";
import { CopyCode } from "./copy-code";
import { CsvExport } from "./csv-export";

export const metadata: Metadata = { title: "Assinaturas" };
export const dynamic = "force-dynamic";

const METHODS: Record<string, { label: string; tone: string }> = {
  TYPED: { label: "Digitada", tone: "bg-cobalt-tint text-cobalt" },
  DRAWN: { label: "Desenhada", tone: "bg-ok-tint text-ok" },
  UPLOADED: { label: "Enviada", tone: "bg-warn-tint text-warn" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Lê o primeiro valor de um search param que pode ser string ou array. */
function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Converte "YYYY-MM-DD" em Date no início/fim do dia (horário local). */
function parseDay(value: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function AssinaturasPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireUser();
  const { companyId } = session;

  const params = await searchParams;
  const q = first(params.q).trim();
  const method = first(params.method).trim();
  const from = first(params.from).trim();
  const to = first(params.to).trim();

  const methodKey = method in METHODS ? method : "";
  const fromDate = parseDay(from, false);
  const toDate = parseDay(to, true);
  const hasFilters = Boolean(q || methodKey || from || to);

  const signerWhere: Prisma.SignerWhereInput = { contract: { companyId } };
  if (q) {
    signerWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const signatureWhere: Prisma.SignatureWhereInput = {
    signer: signerWhere,
    ...(methodKey ? { method: methodKey as "TYPED" | "DRAWN" | "UPLOADED" } : {}),
    ...(fromDate || toDate
      ? {
          signedAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, monthTotal, signedContracts, refused, signatures] = await Promise.all([
    db.signature.count({ where: { signer: { contract: { companyId } } } }),
    db.signature.count({
      where: { signer: { contract: { companyId } }, signedAt: { gte: monthStart } },
    }),
    db.contract.count({ where: { companyId, status: "SIGNED", deletedAt: null } }),
    db.signer.count({ where: { contract: { companyId }, status: "REFUSED" } }),
    db.signature.findMany({
      where: signatureWhere,
      orderBy: { signedAt: "desc" },
      take: 200,
      include: {
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            signedAt: true,
            contract: { select: { id: true, number: true, title: true } },
            fields: {
              orderBy: { page: "asc" },
              select: { id: true, type: true, label: true, value: true, page: true, required: true },
            },
          },
        },
        field: { select: { id: true, type: true, label: true, value: true, page: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Assinaturas"
        description="Prova de cada assinatura registrada nos seus contratos."
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total de assinaturas" value={total} />
        <Stat label="Assinaturas no mês" value={monthTotal} hint="No mês atual" />
        <Stat label="Contratos totalmente assinados" value={signedContracts} />
        <Stat label="Recusas" value={refused} hint="Signatários que recusaram assinar" />
      </dl>

      <Card className="mt-6">
        <CardHeader title="Filtros" />
        <form method="get" action="/assinaturas" className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
              Signatário ou e-mail
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Maria Souza"
              className="field"
            />
          </div>
          <Select
            label="Método"
            name="method"
            defaultValue={methodKey}
            placeholder="Todos os métodos"
            options={[
              { value: "TYPED", label: "Digitada" },
              { value: "DRAWN", label: "Desenhada" },
              { value: "UPLOADED", label: "Enviada" },
            ]}
          />
          <div>
            <label htmlFor="from" className="mb-1.5 block text-sm font-semibold">
              De
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className="field" />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-sm font-semibold">
              Até
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className="field" />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn">
              Filtrar
            </button>
            {hasFilters && (
              <Link
                href="/assinaturas"
                className="text-sm font-semibold text-cobalt hover:underline"
              >
                Limpar filtros
              </Link>
            )}
            <p className="text-xs text-ink-mute">
              {signatures.length === 0
                ? "Nenhum resultado para os filtros atuais."
                : `${signatures.length} ${signatures.length === 1 ? "assinatura encontrada" : "assinaturas encontradas"}.`}
            </p>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Histórico de assinaturas" />
        {signatures.length === 0 ? (
          <div className="p-5">
            <EmptyPage
              title="Nenhuma assinatura registrada"
              description={
                hasFilters
                  ? "Ajuste ou limpe os filtros para encontrar outras assinaturas."
                  : "Assim que um signatário assinar um contrato, a prova de assinatura aparece aqui."
              }
              action={{ href: "/contratos", label: "Ver contratos" }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-paper-line text-xs uppercase tracking-wide text-ink-mute">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Signatário</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Contrato</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Método</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Data da assinatura</th>
                  <th scope="col" className="px-5 py-3 font-semibold">IP</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Código único</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {signatures.map((sig) => {
                  const methodInfo = METHODS[sig.method] ?? {
                    label: sig.method,
                    tone: "bg-paper text-ink-soft",
                  };
                  const contract = sig.signer.contract;
                  return (
                    <tr key={sig.id} className="align-top">
                      <td className="px-5 py-4">
                        <details className="group">
                          <summary className="cursor-pointer list-none">
                            <span className="block font-semibold">{sig.signer.name}</span>
                            <span className="block text-xs text-ink-mute">{sig.signer.email}</span>
                            <span className="mt-1 inline-block text-xs font-semibold text-cobalt">
                              Ver campos preenchidos
                            </span>
                          </summary>
                          <div className="mt-3 space-y-3 rounded-lg border border-paper-line bg-paper p-3">
                            {sig.field && (
                              <div className="rounded-md border border-cobalt/20 bg-cobalt-tint p-2.5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-cobalt">
                                  Campo assinado nesta assinatura
                                </p>
                                <p className="mt-1 text-sm">
                                  <span className="font-semibold">
                                    {FIELD_TYPE[sig.field.type] ?? sig.field.type}
                                  </span>
                                  {sig.field.label ? ` · ${sig.field.label}` : ""}
                                </p>
                                <p className="text-sm text-ink-soft">
                                  {sig.field.value || sig.typedName || "—"}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
                                Campos preenchidos
                              </p>
                              {sig.signer.fields.length === 0 ? (
                                <p className="mt-1 text-sm text-ink-mute">Nenhum campo registrado.</p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {sig.signer.fields.map((f) => (
                                    <li key={f.id} className="rounded-md bg-card p-2.5 text-sm">
                                      <p className="font-semibold">
                                        {FIELD_TYPE[f.type] ?? f.type}
                                        {f.label ? ` · ${f.label}` : ""}
                                      </p>
                                      <p className="text-ink-soft">{f.value || "—"}</p>
                                      <p className="text-xs text-ink-mute">
                                        Página {f.page} · {f.required ? "Obrigatório" : "Opcional"}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </details>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/contratos/${contract.id}`}
                          className="font-semibold text-cobalt hover:underline"
                        >
                          {contract.number}
                        </Link>
                        <p className="text-xs text-ink-mute">{contract.title}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${methodInfo.tone}`}
                        >
                          {methodInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-ink-soft">
                        {formatDateTime(sig.signedAt)}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-soft">{sig.ip ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-ink-soft">{sig.uniqueCode}</code>
                          <CopyCode value={sig.uniqueCode} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/assinaturas/${sig.id}/certificado`}
                          className="inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
                        >
                          Ver certificado
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Exportar assinaturas" />
        <div className="p-5">
          <CsvExport q={q} method={methodKey} from={from} to={to} />
        </div>
      </Card>
    </div>
  );
}
