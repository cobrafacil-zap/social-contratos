import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { extractVariables, humanizeVar } from "@/lib/contract";
import { getTemplateHtml } from "../../html";
import { EditarForm } from "./editar-form";

export const metadata: Metadata = { title: "Editar contrato" };
export const dynamic = "force-dynamic";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const { companyId } = session;

  const contract = await db.contract.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      template: { select: { id: true, name: true, content: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!contract) notFound();

  const currentVariables =
    contract.variables && typeof contract.variables === "object" && !Array.isArray(contract.variables)
      ? (contract.variables as Record<string, string>)
      : {};

  const templateKeys = contract.template
    ? extractVariables(getTemplateHtml(contract.template.content))
    : Object.keys(currentVariables);

  const variableKeys = Array.from(new Set([...templateKeys, ...Object.keys(currentVariables)]));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/contratos/${contract.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para o contrato
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Editar contrato</h1>
        <p className="mt-1 text-ink-mute">
          {contract.number} · {contract.title} — as alterações geram uma nova versão do documento.
        </p>
      </div>

      <EditarForm
        contractId={contract.id}
        initialTitle={contract.title}
        initialValue={contract.value ? String(contract.value) : ""}
        initialStartDate={contract.startDate ? toInputDate(contract.startDate) : ""}
        initialEndDate={contract.endDate ? toInputDate(contract.endDate) : ""}
        variables={variableKeys.map((key) => ({ key, label: humanizeVar(key) }))}
        initialVariables={currentVariables}
        lastVersionNumber={contract.versions[0]?.versionNumber ?? 0}
        lastVersionLocked={contract.versions[0]?.isLocked ?? false}
      />
    </div>
  );
}

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
