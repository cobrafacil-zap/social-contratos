import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { createTemplateAction } from "../actions";
import { ModeloForm } from "../modelo-form";

export const metadata: Metadata = { title: "Novo modelo" };

export default async function NovoModeloPage() {
  const { companyId } = await requireUser();

  const categoryRows = await db.contractTemplate.findMany({
    where: { companyId, deletedAt: null, category: { not: null } },
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
  });
  const categories = categoryRows
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Novo modelo"
        description="Escreva o HTML do contrato e use variáveis como {{cliente_nome}} para preencher os dados automaticamente."
      />
      <ModeloForm
        action={createTemplateAction}
        categories={categories}
        submitLabel="Criar modelo"
        pendingText="Criando..."
        cancelHref="/modelos"
      />
    </div>
  );
}
