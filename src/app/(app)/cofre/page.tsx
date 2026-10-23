import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Vault as VaultIcon } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import { ensureDefaultVault } from "./actions";
import {
  DeleteVaultButton,
  EditVaultButton,
  NewVaultButton,
  SetDefaultVaultButton,
} from "./vault-form";

export const metadata: Metadata = { title: "Cofre de contratos" };
export const dynamic = "force-dynamic";

export default async function CofrePage() {
  const session = await requireUser();
  const companyId = session.companyId;

  // Garante que a empresa sempre tenha um cofre padrão disponível.
  await ensureDefaultVault(companyId);

  const [vaults, storedContracts, storedDocuments, storedSigned] =
    await Promise.all([
      db.vault.findMany({
        where: { companyId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: {
          _count: {
            select: {
              contracts: { where: { deletedAt: null } },
              documents: { where: { deletedAt: null } },
            },
          },
        },
      }),
      db.contract.count({
        where: { companyId, vaultId: { not: null }, deletedAt: null },
      }),
      db.document.count({
        where: { companyId, vaultId: { not: null }, deletedAt: null },
      }),
      db.contract.count({
        where: {
          companyId,
          vaultId: { not: null },
          status: "SIGNED",
          deletedAt: null,
        },
      }),
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Cofre de contratos"
        description="Guarde contratos e documentos da sua empresa organizados por cofre."
        action={<NewVaultButton />}
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Cofres" value={vaults.length} hint="Cofres da empresa" />
        <Stat
          label="Contratos guardados"
          value={storedContracts}
          hint="Vinculados a algum cofre"
        />
        <Stat
          label="Documentos"
          value={storedDocuments}
          hint="Arquivos guardados nos cofres"
        />
        <Stat
          label="Contratos assinados"
          value={storedSigned}
          hint="Assinados e guardados"
        />
      </dl>

      <Card className="mt-8">
        <CardHeader
          title="Seus cofres"
          action={
            <span className="text-sm text-ink-mute">
              {vaults.length}{" "}
              {vaults.length === 1 ? "cofre" : "cofres"}
            </span>
          }
        />
        {vaults.length === 0 ? (
          <EmptyState
            icon={<VaultIcon className="h-8 w-8" aria-hidden />}
            title="Nenhum cofre por aqui"
            description="Crie o primeiro cofre para começar a guardar contratos e documentos."
          />
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {vaults.map((vault) => (
              <article
                key={vault.id}
                className="flex flex-col rounded-xl border border-paper-line bg-card p-4"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: vault.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold">{vault.name}</h3>
                      {vault.isDefault ? (
                        <span className="rounded-md bg-cobalt-tint px-2 py-0.5 text-[11px] font-semibold text-cobalt">
                          Padrão
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-ink-mute">
                      {vault.description || "Sem descrição."}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-sm">
                  <div>
                    <dt className="text-xs text-ink-mute">Contratos</dt>
                    <dd className="font-bold tabular-nums">
                      {vault._count.contracts}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-mute">Documentos</dt>
                    <dd className="font-bold tabular-nums">
                      {vault._count.documents}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/cofre/${vault.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cobalt px-3 text-sm font-semibold text-white transition-colors hover:bg-cobalt-dark"
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden />
                    Abrir
                  </Link>
                  <SetDefaultVaultButton
                    vaultId={vault.id}
                    isDefault={vault.isDefault}
                    compact
                  />
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
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
