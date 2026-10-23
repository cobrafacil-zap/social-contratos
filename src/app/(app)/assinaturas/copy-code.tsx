"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Botão simples que copia um texto (ex.: código único da assinatura) para a área de transferência. */
export function CopyCode({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copiado" : label}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-paper-line bg-card px-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Copiado" : label}
    </button>
  );
}
