"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Botão que copia um texto (link de assinatura) para a área de transferência. */
export function CopyLink({ url, label = "Copiar" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (sem permissão) — o link continua visível para copiar manualmente
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-ok" aria-hidden /> Copiado
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden /> {label}
        </>
      )}
    </button>
  );
}
