"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Mail, PartyPopper } from "lucide-react";

/**
 * Tela de sucesso após o envio do e-mail de assinatura.
 * Animação: envelope "voa", check desenhado, confete e os links.
 */
export function SendSuccess({
  link,
  emailed,
  email,
  contractNumber,
  contractTitle,
  error,
}: {
  link: string;
  emailed: number;
  email: string;
  contractNumber?: string;
  contractTitle?: string;
  error?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const confetti = Array.from({ length: 16 }, (_, i) => ({
    left: `${5 + ((i * 41) % 90)}%`,
    delay: `${(i % 5) * 110}ms`,
    drift: `${((i % 5) - 2) * 30}px`,
    spin: 240 + (i % 5) * 150,
    color: ["#2F4BFF", "#12805C", "#A86400", "#B42318", "#10131A"][i % 5],
  }));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-paper-line bg-white p-8 text-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
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

      {/* Envelope + check */}
      <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
        <span className="ss-pulse-ring absolute inset-0 rounded-full bg-cobalt/25" aria-hidden />
        <span
          className="ss-pop flex h-24 w-24 items-center justify-center rounded-2xl bg-cobalt text-white shadow-xl shadow-cobalt/30"
          aria-hidden
        >
          <Mail className="h-11 w-11" />
        </span>
        <span className="ss-pop absolute flex h-11 w-11 items-center justify-center rounded-full bg-ok text-white shadow-lg" style={{ animationDelay: "420ms" }}>
          <Check className="h-6 w-6" />
        </span>
      </div>

      <h2 className="ss-pop relative text-2xl font-extrabold tracking-tight" style={{ animationDelay: "140ms" }}>
        {emailed > 0 ? "Contrato enviado!" : "Contrato criado!"}
      </h2>
      <p className="ss-pop relative mx-auto mt-2 max-w-md text-ink-soft" style={{ animationDelay: "220ms" }}>
        {emailed > 0 ? (
          <>
            Enviamos o link de assinatura para <strong>{email}</strong>. O cliente assina direto no
            celular, sem precisar criar conta.
          </>
        ) : (
          <>O contrato foi criado. Envie o link abaixo para quem deve assinar.</>
        )}
      </p>

      {contractNumber && (
        <p className="ss-pop relative mt-3 text-sm text-ink-mute" style={{ animationDelay: "300ms" }}>
          {contractTitle} · <span className="font-mono font-semibold text-ink-soft">{contractNumber}</span>
        </p>
      )}

      {error && (
        <p className="ss-pop relative mt-3 rounded-lg bg-warn-tint px-3.5 py-2.5 text-sm text-warn" style={{ animationDelay: "340ms" }}>
          {error}
        </p>
      )}

      {/* Link */}
      <div className="ss-pop relative mt-6 flex flex-col gap-2 sm:flex-row" style={{ animationDelay: "380ms" }}>
        <div className="min-w-0 flex-1 rounded-lg border border-paper-line bg-paper px-3.5 py-2.5 text-left font-mono text-xs text-ink-soft">
          <span className="block truncate">{link}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg border border-paper-line bg-white px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          {copied ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      <div className="ss-pop relative mt-6 flex flex-wrap justify-center gap-2" style={{ animationDelay: "440ms" }}>
        <Link href="/contratos" className="btn">
          Ver contratos
        </Link>
        <Link
          href="/contratos/novo"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          <PartyPopper className="h-4 w-4" aria-hidden /> Enviar outro
        </Link>
      </div>
    </div>
  );
}
