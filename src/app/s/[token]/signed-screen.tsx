"use client";

import { useState } from "react";
import { Download, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";

/** Dados do contrato usados na tela final de obrigado. */
export type SignedInfo = {
  companyName: string;
  contractTitle: string;
  contractNumber: string;
  signerName: string;
  signedAt?: Date | string | null;
  allSigned: boolean;
  documentHtml: string;
};

/**
 * Tela final do cliente depois de assinar: agradecimento, download do PDF e
 * comprovante. Ela **substitui** a tela de assinatura — o documento e o
 * formulário deixam de aparecer (o contrato já está assinado).
 */
export function SignedScreen({
  companyName,
  contractTitle,
  contractNumber,
  signerName,
  signedAt,
  allSigned,
  documentHtml,
}: SignedInfo) {
  const [showDoc, setShowDoc] = useState(false);
  const [confetti] = useState(() =>
    Array.from({ length: 26 }, (_, i) => ({
      left: `${3 + ((i * 37) % 94)}%`,
      delay: `${(i % 8) * 90}ms`,
      drift: `${((i % 7) - 3) * 30}px`,
      spin: 240 + (i % 5) * 150,
      color: ["#2F4BFF", "#12805C", "#A86400", "#7C3AED", "#10131A", "#DB2777"][i % 6],
    }))
  );

  return (
    <>
      {/* --------------------------- O QUE O CLIENTE VÊ --------------------------- */}
      <div className="ss-print-hide">
        <section className="relative overflow-hidden rounded-2xl border border-ok/25 bg-gradient-to-b from-ok-tint to-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 0%, rgba(18,128,92,0.16) 0, transparent 45%), radial-gradient(circle at 88% 8%, rgba(47,75,255,0.14) 0, transparent 42%)",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {confetti.map((c, i) => (
              <span
                key={i}
                className="ss-confetti"
                style={
                  {
                    left: c.left,
                    backgroundColor: c.color,
                    animationDelay: c.delay,
                    "--ss-drift": c.drift,
                    "--ss-spin": `${c.spin}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center">
              <span className="ss-pulse-ring absolute inset-0 rounded-full bg-ok/35" aria-hidden />
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-ok text-white shadow-xl shadow-ok/30">
                <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" aria-hidden>
                  <path
                    className="ss-check-path"
                    d="M4.5 12.5l5 5 10-11"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            <p className="ss-pop text-sm font-bold uppercase tracking-[0.18em] text-ok">
              {allSigned ? "Contrato concluído" : "Assinatura registrada"}
            </p>

            <h2
              className="ss-pop mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
              style={{ animationDelay: "120ms" }}
            >
              Obrigado por fazer parte da equipe!
            </h2>

            <p
              className="ss-pop mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft"
              style={{ animationDelay: "220ms" }}
            >
              {signerName ? `${signerName}, sua` : "Sua"} assinatura em{" "}
              <strong className="text-ink">{contractTitle}</strong> ({contractNumber}) já está registrada.
              Ficamos felizes com a sua parceria com a <strong className="text-ink">{companyName}</strong>.
            </p>

            {/* ------------------------------- AÇÕES ------------------------------- */}
            <div
              className="ss-pop mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center"
              style={{ animationDelay: "320ms" }}
            >
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-bold text-white shadow-lg shadow-ink/20 transition-all duration-200 hover:bg-cobalt hover:shadow-xl hover:shadow-cobalt/25 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" aria-hidden />
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => setShowDoc((v) => !v)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-paper-line bg-white px-6 text-sm font-semibold text-ink-soft transition-all duration-200 hover:border-cobalt/40 hover:text-ink"
              >
                <FileText className="h-4 w-4" aria-hidden />
                {showDoc ? "Ocultar documento" : "Ver documento"}
              </button>
            </div>
            <p className="ss-pop mt-3 text-xs text-ink-mute" style={{ animationDelay: "380ms" }}>
              Em "Baixar PDF", escolha <strong>Salvar como PDF</strong> na caixa de impressão.
            </p>
          </div>
        </section>

        {/* ------------------------- RESUMO / COMPROVANTE ------------------------- */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-paper-line bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">Documento</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{contractTitle}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-mute">{contractNumber}</p>
          </div>
          <div className="rounded-xl border border-paper-line bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">Assinado por</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{signerName}</p>
            <p className="mt-0.5 text-xs text-ink-mute">
              {signedAt ? formatDateTime(signedAt) : "agora"}
            </p>
          </div>
          <div className="rounded-xl border border-paper-line bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">Validade</p>
            <p className="mt-1 text-sm font-semibold text-ink">Assinatura eletrônica válida</p>
            <p className="mt-0.5 text-xs text-ink-mute">{formatDate(new Date())}</p>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-mute">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Registro criptografado com data, hora, IP e dispositivo
          <Sparkles className="ml-1 h-3 w-3" aria-hidden />
        </p>

        {/* --------------------------- DOCUMENTO EM TELA --------------------------- */}
        {showDoc && (
          <section className="ss-pop mt-6 rounded-xl border border-paper-line bg-white p-6 sm:p-10">
            <h3 className="mb-5 flex items-center gap-2 border-b border-paper-line pb-3 text-sm font-bold uppercase tracking-wide text-ink-mute">
              <FileText className="h-4 w-4" aria-hidden /> Documento assinado
            </h3>
            <div
              className="prose-sm max-w-none leading-relaxed text-ink"
              dangerouslySetInnerHTML={{ __html: documentHtml }}
            />
          </section>
        )}
      </div>

      {/* -------------------------- VERSÃO PARA IMPRESSÃO -------------------------- */}
      <Printable
        companyName={companyName}
        contractTitle={contractTitle}
        contractNumber={contractNumber}
        signerName={signerName}
        signedAt={signedAt}
        documentHtml={documentHtml}
      />
    </>
  );
}

/** Aparece apenas na caixa "Salvar como PDF" / impressora. */
function Printable({
  companyName,
  contractTitle,
  contractNumber,
  signerName,
  signedAt,
  documentHtml,
}: {
  companyName: string;
  contractTitle: string;
  contractNumber: string;
  signerName: string;
  signedAt?: Date | string | null;
  documentHtml: string;
}) {
  return (
    <div className="ss-print-only">
      <header style={{ borderBottom: "1px solid #E4E7EC", paddingBottom: 12, marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{companyName}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7385" }}>
          {contractTitle} · {contractNumber}
        </p>
      </header>

      <div
        style={{ fontSize: 12, lineHeight: 1.7, color: "#10131A" }}
        dangerouslySetInnerHTML={{ __html: documentHtml }}
      />

      <section style={{ marginTop: 28, borderTop: "1px solid #E4E7EC", paddingTop: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6B7385" }}>
          Comprovante de assinatura eletrônica
        </p>
        <table style={{ width: "100%", marginTop: 10, fontSize: 11, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", color: "#6B7385" }}>Assinado por</td>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>{signerName}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#6B7385" }}>Data e hora</td>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>
                {signedAt ? formatDateTime(signedAt) : "—"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#6B7385" }}>Documento</td>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>{contractNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#6B7385" }}>Registro</td>
              <td style={{ padding: "4px 0", fontWeight: 700 }}>
                Criptografado com data, hora, IP e dispositivo
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 14, fontSize: 10, color: "#6B7385" }}>
          Documento emitido por {companyName} via Social Sign.
        </p>
      </section>
    </div>
  );
}
