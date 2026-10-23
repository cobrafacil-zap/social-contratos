"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy } from "lucide-react";

/** Um passo do guia: o que fazer na tela e o que acontece em seguida. */
export type GuiaStep = {
  /** Âncora da seção (usada no índice e no link "ver nesta seção"). */
  id: string;
  /** Número exibido na bolinha. */
  numero: number;
  /** Nome da tela. */
  tela: string;
  /** Rota da tela (mostrada como atalho). */
  rota: string;
  /** Resumo em uma frase. */
  resumo: string;
  /** O que o usuário precisa fazer. */
  fazer: string[];
  /** O que o sistema faz depois disso. */
  acontece: string[];
  /** Links relacionados exibidos no fim do passo. */
  atalhos?: { label: string; href: string }[];
};

/**
 * Lista de passos numerados (bolinha com número + título + descrição).
 * Responsiva: em telas pequenas o número fica acima do conteúdo.
 */
export function GuiaSteps({ steps }: { steps: GuiaStep[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.id} id={step.id} className="scroll-mt-24">
          <article className="rounded-xl border border-paper-line bg-card p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-cobalt text-base font-extrabold text-white"
              >
                {step.numero}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-extrabold tracking-tight sm:text-lg">{step.tela}</h3>
                  <code className="rounded-md bg-paper px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-mute">
                    {step.rota}
                  </code>
                </div>
                <p className="mt-1 text-sm text-ink-mute">{step.resumo}</p>

                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">O que fazer</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                      {step.fazer.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span
                            aria-hidden
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">
                      O que acontece
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                      {step.acontece.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span
                            aria-hidden
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ok"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {step.atalhos && step.atalhos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.atalhos.map((atalho) => (
                      <Link
                        key={atalho.href}
                        href={atalho.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper"
                      >
                        {atalho.label}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

/**
 * Bloco de texto pronto para copiar (mensagens para o cliente, listas de
 * variáveis etc.) com botão "Copiar" e feedback "Copiado!".
 */
export function CopyExample({
  titulo,
  descricao,
  texto,
}: {
  titulo: string;
  descricao?: string;
  texto: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Área de transferência indisponível (navegador sem permissão/HTTPS):
      // o texto continua visível para copiar manualmente.
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-paper-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-paper-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{titulo}</p>
          {descricao && <p className="mt-0.5 text-xs text-ink-mute">{descricao}</p>}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar: ${titulo}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-paper-line bg-card px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-ok" aria-hidden /> Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar
            </>
          )}
        </button>
      </div>

      <pre className="flex-1 whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-soft">
        {texto}
      </pre>

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? `${titulo} copiado para a área de transferência.` : ""}
      </span>
    </div>
  );
}
