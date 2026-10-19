import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { hashToken } from "@/lib/contract";
import { formatDate, formatDateTime } from "@/lib/format";
import { SignForm } from "./sign-form";

export const metadata: Metadata = { title: "Assinar documento", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const signer = await db.signer.findUnique({
    where: { tokenHash },
    include: {
      contract: { include: { client: true, company: true } },
      version: true,
      fields: true,
    },
  });

  if (!signer) notFound();

  const expired = signer.tokenExpiresAt.getTime() < Date.now();
  const revoked = !!signer.tokenRevokedAt;
  const alreadySigned = signer.status === "SIGNED";
  const refused = signer.status === "REFUSED";

  const fields = signer.fields.map((sf) => ({
    id: sf.id,
    type: sf.type,
    label: sf.label,
    required: sf.required,
  }));

  return (
    <main className="min-h-dvh bg-paper py-8">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              {signer.contract.company.name}
            </p>
            <p className="text-sm text-ink-mute">Documento para assinatura</p>
          </div>
          <span className="rounded-lg bg-ink px-2.5 py-1 text-xs font-bold text-white">Social Sign</span>
        </header>

        <section className="mb-5 rounded-xl border border-paper-line bg-white p-5">
          <h1 className="text-xl font-extrabold tracking-tight">{signer.contract.title}</h1>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-mute">Contrato</dt>
              <dd className="font-semibold">{signer.contract.number}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-mute">Signatário</dt>
              <dd className="font-semibold">
                {signer.name} · {signer.email}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-mute">Papel</dt>
              <dd className="font-semibold">{signer.role}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-mute">Expira em</dt>
              <dd className="font-semibold">{formatDate(signer.tokenExpiresAt)}</dd>
            </div>
          </dl>
        </section>

        {revoked && (
          <div className="rounded-xl border border-bad/30 bg-bad-tint p-5 text-center">
            <p className="font-bold text-bad">Este link de assinatura foi revogado.</p>
            <p className="mt-1 text-sm text-ink-soft">Peça um novo link ao responsável da empresa.</p>
          </div>
        )}

        {expired && !revoked && (
          <div className="rounded-xl border border-warn/30 bg-warn-tint p-5 text-center">
            <p className="font-bold text-warn">Este link expirou em {formatDateTime(signer.tokenExpiresAt)}.</p>
            <p className="mt-1 text-sm text-ink-soft">Peça um novo link ao responsável da empresa.</p>
          </div>
        )}

        {alreadySigned && !revoked && !expired && (
          <div className="rounded-xl border border-ok/30 bg-ok-tint p-5 text-center">
            <p className="font-bold text-ok">Este documento já foi assinado por você.</p>
            <p className="mt-1 text-sm text-ink-soft">Assinado em {formatDateTime(signer.signedAt)}.</p>
          </div>
        )}

        {refused && (
          <div className="rounded-xl border border-warn/30 bg-warn-tint p-5 text-center">
            <p className="font-bold text-warn">Você recusou assinar este documento.</p>
          </div>
        )}

        {!revoked && !expired && !alreadySigned && !refused && (
          <>
            <section className="mb-5 rounded-xl border border-paper-line bg-white p-6 sm:p-10">
              <h2 className="mb-4 border-b border-paper-line pb-3 text-sm font-bold uppercase tracking-wide text-ink-mute">
                Documento
              </h2>
              <div
                className="prose-sm max-w-none leading-relaxed text-ink"
                dangerouslySetInnerHTML={{ __html: signer.version.renderedHtml }}
              />
            </section>

            <section className="rounded-xl border border-paper-line bg-white p-5 sm:p-6">
              <h2 className="mb-4 text-base font-bold">Preencha e assine</h2>
              <SignForm token={token} fields={fields} signerName={signer.name} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
