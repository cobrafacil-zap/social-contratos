import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { formatDateTime } from "@/lib/format";
import { FIELD_TYPE } from "@/lib/status";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificado de assinatura" };
export const dynamic = "force-dynamic";

const METHODS: Record<string, string> = {
  TYPED: "Digitada",
  DRAWN: "Desenhada",
  UPLOADED: "Enviada",
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-paper-line py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-full text-xs font-semibold uppercase tracking-wide text-ink-mute sm:w-56">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function CertificadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const { companyId } = session;

  const signature = await db.signature.findFirst({
    where: { id, signer: { contract: { companyId } } },
    include: {
      signer: {
        include: {
          contract: { include: { client: true } },
        },
      },
      field: true,
    },
  });

  if (!signature) notFound();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      legalName: true,
      cnpj: true,
      address: true,
      phone: true,
      email: true,
      website: true,
    },
  });

  const { signer } = signature;
  const { contract } = signer;
  const client = contract.client;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/assinaturas"
          className="text-sm font-semibold text-cobalt hover:underline"
        >
          ← Voltar para assinaturas
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-xl border border-paper-line bg-white p-6 print:border-0 print:p-0">
        <header className="border-b-2 border-ink pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">
            Certificado de assinatura
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {contract.title}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Contrato {contract.number} · Código único {signature.uniqueCode}
          </p>
        </header>

        <section className="mt-6">
          <h2 className="text-base font-bold">Empresa</h2>
          <dl className="mt-2">
            <Row label="Razão social" value={company?.legalName || company?.name || "—"} />
            <Row label="Nome fantasia" value={company?.name || "—"} />
            <Row label="CNPJ" value={company?.cnpj || "—"} />
            <Row label="Endereço" value={company?.address || "—"} />
            <Row label="E-mail" value={company?.email || "—"} />
            <Row label="Telefone" value={company?.phone || "—"} />
            <Row label="Site" value={company?.website || "—"} />
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold">Cliente</h2>
          <dl className="mt-2">
            <Row label="Nome" value={client.name} />
            <Row label="Documento" value={client.document || "—"} />
            <Row label="E-mail" value={client.email} />
            <Row label="Empresa" value={client.companyName || "—"} />
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold">Signatário</h2>
          <dl className="mt-2">
            <Row label="Nome" value={signer.name} />
            <Row label="E-mail" value={signer.email} />
            <Row label="Papel no contrato" value={signer.role || "—"} />
            <Row label="Status do signatário" value={signer.status} />
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold">Prova de assinatura</h2>
          <dl className="mt-2">
            <Row label="Data da assinatura" value={formatDateTime(signature.signedAt)} />
            <Row label="Termos aceitos em" value={formatDateTime(signature.termsAcceptedAt)} />
            <Row label="Método" value={METHODS[signature.method] ?? signature.method} />
            <Row label="Nome digitado" value={signature.typedName || "—"} />
            <Row
              label="Campo assinado"
              value={
                signature.field
                  ? `${FIELD_TYPE[signature.field.type] ?? signature.field.type}${
                      signature.field.label ? ` · ${signature.field.label}` : ""
                    } — ${signature.field.value || "—"}`
                  : "—"
              }
            />
            <Row label="Endereço IP" value={signature.ip || "—"} />
            <Row label="User agent" value={<span className="break-all">{signature.userAgent || "—"}</span>} />
            <Row label="Código único" value={<code className="font-mono">{signature.uniqueCode}</code>} />
            <Row
              label="Hash do documento (SHA-256)"
              value={<code className="break-all font-mono text-xs">{signature.documentSha256}</code>}
            />
          </dl>
        </section>

        <footer className="mt-8 border-t border-paper-line pt-4 text-xs text-ink-mute">
          <p>
            Este documento comprova o registro da assinatura eletrônica e a integridade do arquivo
            assinado (hash SHA-256). Emitido em {formatDateTime(new Date())} por {company?.name ?? "empresa"}.
          </p>
        </footer>
      </article>
    </div>
  );
}
