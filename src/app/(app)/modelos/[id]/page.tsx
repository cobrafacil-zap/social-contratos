import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { templateHtml } from "@/lib/templates";
import { extractVariables, humanizeVar } from "@/lib/contract";
import { formatDate } from "@/lib/format";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { deleteTemplateAction } from "./actions";

export const metadata: Metadata = { title: "Modelo de contrato" };
export const dynamic = "force-dynamic";

export default async function ModeloDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { companyId } = await requireUser();

  const { id } = await params;
  const sp = await searchParams;
  const confirmandoExclusao = sp.excluir === "1";

  const template = await db.contractTemplate.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { _count: { select: { contracts: { where: { deletedAt: null } } } } },
  });

  if (!template) notFound();

  const html = templateHtml(template.content);
  const variaveis = extractVariables(html);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={template.name}
        description={
          template.category
            ? `Modelo da categoria ${template.category} · criado em ${formatDate(template.createdAt)}`
            : `Modelo sem categoria · criado em ${formatDate(template.createdAt)}`
        }
        action={
          <Link
            href="/modelos"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-card px-5 text-[15px] font-semibold text-ink-soft hover:bg-paper"
          >
            Voltar
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {confirmandoExclusao && (
            <Alert tone="warn">
              <p className="font-semibold">Excluir o modelo &ldquo;{template.name}&rdquo;?</p>
              <p className="mt-1 text-[13px]">
                O modelo deixará de aparecer na listagem. Os contratos já criados continuam intactos.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={deleteTemplateAction}>
                  <input type="hidden" name="id" value={template.id} />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-bad px-4 text-sm font-semibold text-white hover:brightness-95"
                  >
                    Confirmar exclusão
                  </button>
                </form>
                <Link
                  href={`/modelos/${template.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-paper-line bg-card px-4 text-sm font-semibold text-ink-soft hover:bg-paper"
                >
                  Cancelar
                </Link>
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader title="Pré-visualização do modelo" />
            <div className="p-5">
              {template.headerHtml ? (
                <div
                  className="mb-4 border-b border-paper-line pb-3 text-sm text-ink-mute"
                  dangerouslySetInnerHTML={{ __html: template.headerHtml }}
                />
              ) : null}

              {html.trim().length > 0 ? (
                <div
                  className="max-w-none text-[15px] leading-relaxed text-ink-soft [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-ink [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mb-3 [&_ul]:mt-2"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="text-sm text-ink-mute">Este modelo ainda não possui conteúdo.</p>
              )}

              {template.footerHtml ? (
                <div
                  className="mt-4 border-t border-paper-line pt-3 text-sm text-ink-mute"
                  dangerouslySetInnerHTML={{ __html: template.footerHtml }}
                />
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Ações" />
            <div className="space-y-2.5 p-5">
              <Link
                href={`/contratos/novo?templateId=${template.id}`}
                className="btn w-full justify-center"
              >
                Usar modelo
              </Link>
              <Link
                href={`/modelos/${template.id}/editar`}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-paper-line bg-card px-5 text-[15px] font-semibold text-ink-soft hover:bg-paper"
              >
                Editar
              </Link>
              {!confirmandoExclusao && (
                <Link
                  href={`/modelos/${template.id}?excluir=1`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-bad/30 bg-bad-tint px-5 text-[15px] font-semibold text-bad hover:bg-bad/10"
                >
                  Excluir
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Detalhes" />
            <dl className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-mute">Variáveis</dt>
                <dd className="font-semibold tabular-nums">{variaveis.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-mute">Contratos que usam</dt>
                <dd className="font-semibold tabular-nums">{template._count.contracts}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-mute">Criado em</dt>
                <dd className="font-semibold">{formatDate(template.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-mute">Atualizado em</dt>
                <dd className="font-semibold">{formatDate(template.updatedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Variáveis do modelo" />
            <div className="p-5">
              {variaveis.length === 0 ? (
                <p className="text-sm text-ink-mute">
                  Nenhuma variável detectada. Use {"{{variavel}}"} no HTML para criar campos
                  preenchíveis.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {variaveis.map((v) => (
                      <li key={v} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-ink">{humanizeVar(v)}</span>
                        <code className="font-mono text-xs text-cobalt">{`{{${v}}}`}</code>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-mute">
                    Estas variáveis são preenchidas automaticamente na criação do contrato.
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
