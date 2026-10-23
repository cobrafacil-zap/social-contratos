import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ClientForm } from "../../cliente-form";
import { updateClientAction } from "../actions";

export const metadata: Metadata = { title: "Editar cliente" };
export const dynamic = "force-dynamic";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  const client = await db.client.findFirst({
    where: { id, companyId: session.companyId, deletedAt: null },
  });

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Editar cliente"
        description={client.name}
        action={
          <Link
            href={`/clientes/${client.id}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-card px-4 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
          >
            Voltar
          </Link>
        }
      />

      <Card>
        <CardHeader title="Dados do cliente" />
        <div className="p-5">
          <ClientForm
            action={updateClientAction}
            clientId={client.id}
            submitLabel="Salvar alterações"
            pendingText="Salvando…"
            defaultValues={{
              name: client.name,
              responsibleName: client.companyName ?? "",
              email: client.email,
              document: client.document ?? "",
              phone: client.phone ?? "",
              legalName: "",
              address: client.address ?? "",
              city: client.city ?? "",
              state: client.state ?? "",
              zip: client.zip ?? "",
            }}
          />
        </div>
      </Card>
    </div>
  );
}
