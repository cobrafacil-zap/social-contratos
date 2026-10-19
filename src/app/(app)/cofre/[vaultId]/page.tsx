import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, FolderOpen } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatBytes, formatCurrency, formatDate } from "@/lib/format";
import { DOCUMENT_KIND } from "@/lib/status";
import {
  isStorageConfigured,
  MAX_UPLOAD_BYTES,
  STORAGE_NOT_CONFIGURED_MESSAGE,
} from "@/lib/storage";
import {
  AddContractForm,
  DeleteVaultButton,
  DownloadDocumentButton,
  EditVaultButton,
  RemoveContractButton,
  RemoveDocumentButton,
  SetDefaultVaultButton,
  UploadDocumentForm,
} from "../vault-form";

export const metadata: Metadata = { title: "Cofre de contratos" };
export const dynamic = "force-dynamic";

const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = await params;
  const session = await requireUser();
  const companyId = session.companyId;

  // Guarda contra ids inválidos na URL (o Prisma lança erro para uuid malformado).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vaultId)) {
    notFound();
  }

  const vault = await db.vault.findFirst({
    where: { id: vaultId, companyId },
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { name: true } } },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vault) notFound();

  // Contratos que ainda não estão em cofre + contratos de outros cofres (movimentação).
  const companyContracts = await db.contract.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      vaultId: true,
      vault: { select: { name: true } },
    },
  });

  const contractOptions = companyContracts
    .filter((contract) => contract.vaultId !== vault.id)
    .map((contract) => ({
      value: contract.id,
      label: contract.vault
        ? `${contract.number} — ${contract.title} (mover de “${contract.vault.name}”)`
        : `${contract.number} — ${contract.title} (sem cofre)`,
    }));

  const storageEnabled = isStorageConfigured();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/cofre"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute transition-colors hover:text-cobalt"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para o cofre
      </Link>

      <PageHeader
        title={vault.name}
        description={vault.description || "Cofre de contratos e documentos."}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SetDefaultVaultButton vaultId={vault.id} isDefault={vault.isDefault} />
            <EditVaultButton
              vault={{
                id: vault.id,
                name: vault.name,
                description: vault.description,
                color: vault.color,
              }}
            />
            <DeleteVaultButton vaultId={vault.id} name={vault.name} />
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: vault.color }}
        />
        <span className="text-sm text-ink-mute">Cor do cofre</span>
        {vault.isDefault ? (
          <span className="rounded-md bg-cobalt-tint px-2 py-0.5 text-xs font-semibold text-cobalt">
            Cofre padrão
          </span>
        ) : null}
        <span className="rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">
          {vault.contracts.length}{" "}
          {vault.contracts.length === 1 ? "contrato" : "contratos"}
        </span>
        <span className="rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">
          {vault.documents.length}{" "}
          {vault.documents.length === 1 ? "documento" : "documentos"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Contratos guardados"
              action={
                <span className="text-sm text-ink-mute">
                  {vault.contracts.length}{" "}
                  {vault.contracts.length === 1 ? "contrato" : "contratos"}
                </span>
              }
            />
            {vault.contracts.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" aria-hidden />}
                title="Nenhum contrato guardado"
                description="Use o formulário ao lado para guardar um contrato neste cofre."
              />
            ) : (
              <ul className="divide-y divide-paper-line">
                {vault.contracts.map((contract) => (
                  <li
                    key={contract.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/contratos/${contract.id}`}
                        className="block truncate font-semibold transition-colors hover:text-cobalt"
                      >
                        {contract.title}
                      </Link>
                      <p className="truncate text-sm text-ink-mute">
                        {contract.number} · {contract.client.name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-mute">
                        Valor: {formatCurrency(contract.value?.toNumber())}
                        {contract.startDate || contract.endDate
                          ? ` · Período: ${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={contract.status} kind="contract" />
                      <RemoveContractButton
                        vaultId={vault.id}
                        contractId={contract.id}
                        number={contract.number}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Documentos"
              action={
                <span className="text-sm text-ink-mute">
                  {vault.documents.length}{" "}
                  {vault.documents.length === 1 ? "documento" : "documentos"}
                </span>
              }
            />
            {vault.documents.length === 0 ? (
              <EmptyState
                icon={<FolderOpen className="h-8 w-8" aria-hidden />}
                title="Nenhum documento guardado"
                description="Envie um arquivo para guardar neste cofre."
              />
            ) : (
              <ul className="divide-y divide-paper-line">
                {vault.documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{document.fileName}</p>
                      <p className="truncate text-sm text-ink-mute">
                        {DOCUMENT_KIND[document.kind] ?? document.kind} ·{" "}
                        {formatBytes(document.sizeBytes)} · {document.mimeType}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-mute">
                        Enviado em {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <DownloadDocumentButton
                        documentId={document.id}
                        fileName={document.fileName}
                      />
                      <RemoveDocumentButton
                        vaultId={vault.id}
                        documentId={document.id}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Adicionar contrato" />
            <div className="p-5">
              {contractOptions.length === 0 ? (
                <p className="text-sm text-ink-mute">
                  Todos os contratos da empresa já estão guardados neste cofre ou
                  em outro cofre.
                </p>
              ) : (
                <AddContractForm
                  vaultId={vault.id}
                  options={contractOptions}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Enviar documento" />
            <div className="space-y-4 p-5">
              {!storageEnabled ? (
                <Alert tone="warn">
                  O envio de documentos precisa do Supabase Storage configurado.
                  Defina <strong>SUPABASE_URL</strong> e{" "}
                  <strong>SUPABASE_SERVICE_ROLE_KEY</strong> no ambiente (o
                  bucket opcional é <strong>SUPABASE_STORAGE_BUCKET</strong>,
                  padrão &quot;contracts&quot;). Até lá, o cofre continua
                  funcionando para organizar contratos.
                </Alert>
              ) : null}
              <UploadDocumentForm vaultId={vault.id} maxSizeMb={MAX_UPLOAD_MB} />
              {!storageEnabled ? (
                <p className="text-xs text-ink-mute">
                  {STORAGE_NOT_CONFIGURED_MESSAGE}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
