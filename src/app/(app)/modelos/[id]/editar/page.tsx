import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { templateHtml } from "@/lib/templates";
import { PageHeader } from "@/components/ui";
import { ModeloForm } from "../../modelo-form";
import { updateTemplateAction } from "../actions";

export const metadata: Metadata = { title: "Editar modelo" };
export const dynamic = "force-dynamic";

export default async function EditarModeloPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireUser();

  const { id } = await params;

  const [template, categoryRows] = await Promise.all([
    db.contractTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, name: true, category: true, content: true, headerHtml: true, footerHtml: true },
    }),
    db.contractTemplate.findMany({
      where: { companyId, deletedAt: null, category: { not: null } },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    }),
  ]);

  if (!template) notFound();

  const categories = categoryRows
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Editar modelo"
        description={`Ajuste o conteúdo do modelo “${template.name}”.`}
      />
      <ModeloForm
        action={updateTemplateAction.bind(null, template.id)}
        initial={{
          name: template.name,
          category: template.category ?? "",
          html: templateHtml(template.content),
          headerHtml: template.headerHtml ?? "",
          footerHtml: template.footerHtml ?? "",
        }}
        categories={categories}
        submitLabel="Salvar alterações"
        pendingText="Salvando..."
        cancelHref={`/modelos/${template.id}`}
      />
    </div>
  );
}
