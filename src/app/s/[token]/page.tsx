import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, FileText, Clock, User } from "lucide-react";
import { db } from "@/server/db";
import { hashToken } from "@/lib/contract";
import { formatDate, formatDateTime } from "@/lib/format";
import { SignForm } from "./sign-form";
import { ScrollReveal, SignProgress } from "./sign-animations";

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

  const bloqueado = revoked || expired || alreadySigned || refused;

  return (
    <main className="min-h-dvh bg-paper">
      {/* ------------------------------- HERO ------------------------------- */}
      <header className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 12%, #2F4BFF 0, transparent 42%), radial-gradient(circle at 82% 0%, #2F4BFF 0, transparent 38%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-10 pt-8 sm:pt-12">
          <div className="ss-pop flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt">
                <svg viewBox="0 0 28 28" width="18" height="18" aria-hidden>
                  <path
                    d="M8 18.5c3.5 2.5 6.5 1 7.5-2.5s2.5-5.5 5-4.5M8 21h12"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              {signer.contract.company.name}
            </span>
            <span className="ss-float inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Documento protegido
            </span>
          </div>

          <h1 className="ss-pop mt-8 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" style={{ animationDelay: "90ms" }}>
            {signer.contract.title}
          </h1>

          <dl className="ss-pop mt-6 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "180ms" }}>
            {[
              { icon: FileText, label: "Contrato", value: signer.contract.number },
              { icon: User, label: "Signatário", value: `${signer.name} · ${signer.role}` },
              { icon: Clock, label: "Expira em", value: formatDate(signer.tokenExpiresAt) },
            ].map((it) => (
              <div key={it.label} className="rounded-xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                  <it.icon className="h-3.5 w-3.5" aria-hidden />
                  {it.label}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white/95">{it.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* --------------------------- BARRA DE PROGRESSO --------------------------- */}
      <SignProgress step={bloqueado ? 3 : 1} />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {revoked && (
          <div className="rounded-xl border border-bad/30 bg-bad-tint p-6 text-center">
            <p className="font-bold text-bad">Este link de assinatura foi revogado.</p>
            <p className="mt-1 text-sm text-ink-soft">Peça um novo link ao responsável da empresa.</p>
          </div>
        )}

        {expired && !revoked && (
          <div className="rounded-xl border border-warn/30 bg-warn-tint p-6 text-center">
            <p className="font-bold text-warn">Este link expirou em {formatDateTime(signer.tokenExpiresAt)}.</p>
            <p className="mt-1 text-sm text-ink-soft">Peça um novo link ao responsável da empresa.</p>
          </div>
        )}

        {alreadySigned && !revoked && !expired && (
          <div className="rounded-xl border border-ok/30 bg-ok-tint p-6 text-center">
            <p className="font-bold text-ok">Este documento já foi assinado por você.</p>
            <p className="mt-1 text-sm text-ink-soft">Assinado em {formatDateTime(signer.signedAt)}.</p>
          </div>
        )}

        {refused && (
          <div className="rounded-xl border border-warn/30 bg-warn-tint p-6 text-center">
            <p className="font-bold text-warn">Você recusou assinar este documento.</p>
          </div>
        )}

        {!bloqueado && (
          <>
            {/* ----------------------------- DOCUMENTO ----------------------------- */}
            <ScrollReveal>
              <section className="rounded-xl border border-paper-line bg-white p-6 sm:p-10">
                <h2 className="mb-5 flex items-center gap-2 border-b border-paper-line pb-3 text-sm font-bold uppercase tracking-wide text-ink-mute">
                  <FileText className="h-4 w-4" aria-hidden /> Documento
                </h2>
                <div
                  className="prose-sm max-w-none leading-relaxed text-ink"
                  dangerouslySetInnerHTML={{ __html: signer.version.renderedHtml }}
                />
              </section>
            </ScrollReveal>

            {/* ------------------------------ FORMULÁRIO ------------------------------ */}
            <ScrollReveal delay={120} className="mt-6">
              <section className="rounded-xl border border-paper-line bg-white p-5 sm:p-6">
                <h2 className="mb-4 text-base font-bold">Preencha e assine</h2>
                <SignForm token={token} fields={fields} signerName={signer.name} />
              </section>
            </ScrollReveal>

            <ScrollReveal delay={200} className="mt-6">
              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-mute">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Registro criptografado com data, IP e dispositivo
              </p>
            </ScrollReveal>
          </>
        )}
      </div>
    </main>
  );
}
