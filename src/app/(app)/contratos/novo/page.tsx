import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { extractVariables, humanizeVar } from "@/lib/contract";
import { ContratoForm } from "../contrato-form";
import { getTemplateHtml } from "../html";
import type { ClientOption, CompanyOption, TemplateOption, VaultOption } from "../shared";

export const metadata: Metadata = { title: "Novo contrato" };
export const dynamic = "force-dynamic";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string; clientId?: string }>;
}) {
  const session = await requireUser();
  const { companyId } = session;
  const sp = await searchParams;

  const [clients, templates, vaults, company] = await Promise.all([
    db.client.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        document: true,
        email: true,
        companyName: true,
        address: true,
        city: true,
        state: true,
        zip: true,
      },
    }),
    db.contractTemplate.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, content: true },
    }),
    db.vault.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, color: true, isDefault: true },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        legalName: true,
        address: true,
        phone: true,
        email: true,
        cnpj: true,
        responsibleName: true,
      },
    }),
  ]);

  const templateOptions: TemplateOption[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    variables: extractVariables(getTemplateHtml(t.content)).map((key) => ({
      key,
      label: humanizeVar(key),
    })),
  }));

  const clientOptions: ClientOption[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    document: c.document,
    email: c.email,
    companyName: c.companyName,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
  }));

  const vaultOptions: VaultOption[] = vaults.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    color: v.color,
    isDefault: v.isDefault,
  }));

  const companyOption: CompanyOption = {
    name: company?.name ?? "",
    legalName: company?.legalName ?? null,
    address: company?.address ?? null,
    phone: company?.phone ?? null,
    email: company?.email ?? null,
    cnpj: company?.cnpj ?? null,
    responsibleName: company?.responsibleName ?? null,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Contratos
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Novo contrato</h1>
        <p className="mt-1 text-ink-mute">
          Preencha os dados do contrato, escolha o cofre e defina as variáveis e os signatários.
        </p>
      </div>

      <ContratoForm
        clients={clientOptions}
        templates={templateOptions}
        vaults={vaultOptions}
        company={companyOption}
        defaultTemplateId={sp.templateId ?? undefined}
        defaultClientId={sp.clientId ?? undefined}
      />
    </div>
  );
}
