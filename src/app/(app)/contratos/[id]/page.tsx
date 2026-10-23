import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  FileText,
  FolderOpen,
  History,
  PenLine,
  Send,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatBytes, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { DOCUMENT_KIND } from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { EnviarForm } from "./enviar-form";
import {
  cancelContractAction,
  deleteContractAction,
  duplicateContractAction,
} from "./actions";
import { getVersionSigners } from "../shared";

export const metadata: Metadata = { title: "Detalhe do contrato" };
export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = ["DRAFT", "SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "EXPIRED"];

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const { companyId } = session;

  const contract = await db.contract.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, document: true, email: true } },
      owner: { select: { id: true, name: true, email: true } },
      vault: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      versions: { orderBy: { versionNumber: "desc" } },
      signers: { orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!contract) notFound();

  const currentVersion = contract.currentVersionId
    ? (contract.versions.find((v) => v.id === contract.currentVersionId) ?? null)
    : (contract.versions[0] ?? null);

  const plannedSigners = getVersionSigners(currentVersion?.content);
  const canEdit = EDITABLE_STATUSES.includes(contract.status);
  // Só é possível (re)enviar enquanto nenhum signatário tiver assinado: depois
  // disso os links existentes já podem ter sido usados.
  const hasSignature = contract.signers.some((s) => s.status === "SIGNED");
  const canResend =
    !hasSignature &&
    ["DRAFT", "SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "EXPIRED"].includes(contract.status);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Contratos
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold text-ink-mute">{contract.number}</span>
              <StatusBadge status={contract.status} kind="contract" />
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight">{contract.title}</h1>
            <p className="mt-1 text-sm text-ink-mute">
              Cliente:{" "}
              <Link href={`/clientes/${contract.client.id}`} className="font-semibold text-cobalt hover:underline">
                {contract.client.name}
              </Link>
              {contract.client.document ? ` · ${contract.client.document}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Link
                href={`/contratos/${contract.id}/editar`}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-card px-4 text-[15px] font-semibold text-ink-soft hover:bg-paper"
              >
                <PenLine className="h-4 w-4" aria-hidden /> Editar variáveis
              </Link>
            )}
            <form action={duplicateContractAction}>
              <input type="hidden" name="id" value={contract.id} />
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-card px-4 text-[15px] font-semibold text-ink-soft hover:bg-paper"
              >
                <Copy className="h-4 w-4" aria-hidden /> Duplicar
              </button>
            </form>
            {contract.status !== "CANCELED" && contract.status !== "SIGNED" && (
              <form action={cancelContractAction}>
                <input type="hidden" name="id" value={contract.id} />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-card px-4 text-[15px] font-semibold text-ink-soft hover:bg-paper"
                >
                  <XCircle className="h-4 w-4" aria-hidden /> Cancelar
                </button>
              </form>
            )}
            <form action={deleteContractAction}>
              <input type="hidden" name="id" value={contract.id} />
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-bad px-4 text-[15px] font-semibold text-white hover:brightness-95"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Excluir
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* ------------------------------ VERSÕES ------------------------------ */}
          <Card>
            <CardHeader
              title="Versões"
              action={
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-mute">
                  <History className="h-4 w-4" aria-hidden /> {contract.versions.length}
                </span>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-mute">
                    <th className="px-5 py-2.5 font-semibold">Versão</th>
                    <th className="px-5 py-2.5 font-semibold">Criada em</th>
                    <th className="px-5 py-2.5 font-semibold">SHA-256</th>
                    <th className="px-5 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-line">
                  {contract.versions.map((version) => (
                    <tr key={version.id}>
                      <td className="px-5 py-3 font-semibold">
                        v{version.versionNumber}
                        {version.id === contract.currentVersionId && (
                          <span className="ml-2 rounded bg-cobalt-tint px-1.5 py-0.5 text-[11px] font-semibold text-cobalt">
                            atual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{formatDateTime(version.createdAt)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-mute">
                        {version.sha256 ? `${version.sha256.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {version.isLocked ? (
                          <span className="rounded-md bg-warn-tint px-2 py-1 text-xs font-semibold text-warn">
                            Travada
                          </span>
                        ) : (
                          <span className="rounded-md bg-paper px-2 py-1 text-xs font-semibold text-ink-soft">
                            Editável
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {contract.versions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-mute">
                        Nenhuma versão registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ------------------------------ PRÉ-VISUALIZAÇÃO ------------------------------ */}
          <Card>
            <CardHeader title="Pré-visualização do documento" />
            <div className="bg-paper/60 p-4 sm:p-6">
              {currentVersion ? (
                <div
                  className="mx-auto max-w-3xl rounded-lg border border-paper-line bg-card p-8 leading-relaxed text-[15px] text-ink-soft [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-ink [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-ink [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:border-paper-line [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-paper-line [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: currentVersion.renderedHtml }}
                />
              ) : (
                <EmptyState
                  title="Sem documento para exibir"
                  description="Este contrato ainda não possui uma versão renderizada."
                />
              )}
            </div>
          </Card>

          {/* ------------------------------ SIGNATÁRIOS ------------------------------ */}
          <Card>
            <CardHeader
              title="Signatários"
              action={
                canResend ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt">
                    <Send className="h-4 w-4" aria-hidden />
                    {contract.status === "DRAFT" ? "Enviar" : "Links"}
                  </span>
                ) : undefined
              }
            />

            <div className="p-5">
              {contract.signers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-mute">
                        <th className="px-3 py-2.5 font-semibold">Nome</th>
                        <th className="px-3 py-2.5 font-semibold">E-mail</th>
                        <th className="px-3 py-2.5 font-semibold">Papel</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 font-semibold">Assinado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-line">
                      {contract.signers.map((signer) => (
                        <tr key={signer.id}>
                          <td className="px-3 py-3 font-medium">{signer.name}</td>
                          <td className="px-3 py-3 text-ink-soft">{signer.email}</td>
                          <td className="px-3 py-3 text-ink-soft">{signer.role}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={signer.status} kind="signer" />
                          </td>
                          <td className="px-3 py-3 text-ink-soft">
                            {signer.signedAt ? formatDateTime(signer.signedAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhum signatário registrado"
                  description={
                    contract.status === "DRAFT"
                      ? "Defina os signatários abaixo e envie o contrato para assinatura."
                      : "Este contrato ainda não tem signatários."
                  }
                />
              )}

              {canResend && (
                <div className="mt-5 border-t border-paper-line pt-5">
                  <h3 className="text-sm font-bold">
                    {contract.status === "DRAFT" ? "Enviar para assinatura" : "Gerar novos links de assinatura"}
                  </h3>
                  <p className="mt-1 text-sm text-ink-mute">
                    {contract.status === "DRAFT" ? (
                      <>
                        Ao enviar, a versão atual é travada e os links de assinatura são gerados
                        (o token fica salvo apenas como hash).
                      </>
                    ) : (
                      <>
                        O link em claro não é salvo, então só aparece logo após a ação. Se você
                        perdeu os links, gere novos abaixo — os signatários que ainda não assinaram
                        recebem links novos e os anteriores deixam de funcionar.
                      </>
                    )}
                  </p>
                  <div className="mt-4">
                    <EnviarForm
                      contractId={contract.id}
                      initialSigners={plannedSigners}
                      mode={contract.status === "DRAFT" ? "send" : "resend"}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ------------------------------ DOCUMENTOS ------------------------------ */}
          <Card>
            <CardHeader title="Documentos" />
            {contract.documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-mute">
                      <th className="px-5 py-2.5 font-semibold">Tipo</th>
                      <th className="px-5 py-2.5 font-semibold">Arquivo</th>
                      <th className="px-5 py-2.5 font-semibold">Tamanho</th>
                      <th className="px-5 py-2.5 font-semibold">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-line">
                    {contract.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-paper px-2 py-1 text-xs font-semibold text-ink-soft">
                            {DOCUMENT_KIND[doc.kind] ?? doc.kind}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">{doc.fileName}</td>
                        <td className="px-5 py-3 tabular-nums text-ink-soft">{formatBytes(doc.sizeBytes)}</td>
                        <td className="px-5 py-3 text-ink-soft">{formatDate(doc.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nenhum documento anexado"
                description="Os PDFs gerados pelas versões assinadas aparecem aqui."
              />
            )}
          </Card>
        </div>

        {/* ------------------------------ SIDEBAR ------------------------------ */}
        <aside className="space-y-6">
          <Card>
            <CardHeader title="Detalhes" />
            <dl className="divide-y divide-paper-line text-sm">
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Valor</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {formatCurrency(contract.value ? contract.value.toString() : null)}
                </dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Início</dt>
                <dd className="mt-0.5">{formatDate(contract.startDate)}</dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Término</dt>
                <dd className="mt-0.5">{formatDate(contract.endDate)}</dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Expira em</dt>
                <dd className="mt-0.5">{formatDate(contract.expiresAt)}</dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Modelo</dt>
                <dd className="mt-0.5">{contract.template?.name ?? "—"}</dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Cofre</dt>
                <dd className="mt-0.5">
                  {contract.vault ? (
                    <Link
                      href="/cofre"
                      className="inline-flex items-center gap-1.5 font-semibold text-cobalt hover:underline"
                    >
                      <FolderOpen className="h-4 w-4" aria-hidden /> {contract.vault.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Responsável</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-ink-mute" aria-hidden /> {contract.owner.name}
                </dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Criado em</dt>
                <dd className="mt-0.5">{formatDateTime(contract.createdAt)}</dd>
              </div>
              {contract.sentAt && (
                <div className="px-5 py-3.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Enviado em</dt>
                  <dd className="mt-0.5">{formatDateTime(contract.sentAt)}</dd>
                </div>
              )}
              {contract.completedAt && (
                <div className="px-5 py-3.5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
                    Concluído em
                  </dt>
                  <dd className="mt-0.5">{formatDateTime(contract.completedAt)}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Versão atual" />
            <div className="px-5 py-4 text-sm">
              {currentVersion ? (
                <>
                  <p className="font-semibold">Versão {currentVersion.versionNumber}</p>
                  <p className="mt-1 text-ink-mute">Criada em {formatDateTime(currentVersion.createdAt)}</p>
                  <p className="mt-1 break-all font-mono text-xs text-ink-mute">{currentVersion.sha256}</p>
                  {currentVersion.isLocked && (
                    <p className="mt-3 rounded-lg bg-warn-tint px-3 py-2 text-xs font-semibold text-warn">
                      Versão travada — o conteúdo não pode ser alterado.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-ink-mute">Nenhuma versão criada.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Ações rápidas" />
            <div className="space-y-2 p-5">
              <Link
                href="/contratos/novo"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-paper-line bg-card px-4 text-sm font-semibold text-ink-soft hover:bg-paper"
              >
                <FileText className="h-4 w-4" aria-hidden /> Criar novo contrato
              </Link>
              {canEdit && (
                <Link
                  href={`/contratos/${contract.id}/editar`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-paper-line bg-card px-4 text-sm font-semibold text-ink-soft hover:bg-paper"
                >
                  <PenLine className="h-4 w-4" aria-hidden /> Editar variáveis
                </Link>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
