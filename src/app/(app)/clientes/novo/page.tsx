import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { createClientAction } from "../actions";
import { ClientForm } from "../cliente-form";

export const metadata: Metadata = { title: "Novo cliente" };
export const dynamic = "force-dynamic";

export default function NovoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo cliente"
        description="Cadastre um cliente para vincular contratos, documentos e assinaturas."
        action={
          <Link
            href="/clientes"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-white px-4 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
          >
            Voltar
          </Link>
        }
      />

      <Card>
        <CardHeader title="Dados do cliente" />
        <div className="p-5">
          <ClientForm
            action={createClientAction}
            submitLabel="Cadastrar cliente"
            pendingText="Cadastrando…"
          />
        </div>
      </Card>
    </div>
  );
}
