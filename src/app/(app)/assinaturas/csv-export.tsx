"use client";
import { useActionState, useState } from "react";
import { Check, Copy, Download, FileSpreadsheet } from "lucide-react";
import { exportarAssinaturas, type CsvState } from "./actions";

/**
 * Gera o CSV das assinaturas no servidor e devolve a string para o cliente
 * exibir em um <pre>, copiar ou baixar.
 */
export function CsvExport({
  q = "",
  method = "",
  from = "",
  to = "",
}: {
  q?: string;
  method?: string;
  from?: string;
  to?: string;
}) {
  const [state, action, pending] = useActionState<CsvState, FormData>(exportarAssinaturas, {});
  const [copied, setCopied] = useState(false);

  async function copyCsv() {
    if (!state.csv) return;
    try {
      await navigator.clipboard.writeText(state.csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="q" value={q} />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />
        <button type="submit" disabled={pending} className="btn">
          {pending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : (
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
          )}
          {pending ? "Gerando…" : "Exportar CSV"}
        </button>
        <p className="text-xs text-ink-mute">
          O arquivo respeita os filtros aplicados na listagem.
        </p>
      </form>

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      {state.csv && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {state.count !== undefined
                ? `${state.count} ${state.count === 1 ? "assinatura encontrada" : "assinaturas encontradas"}`
                : "CSV gerado"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? "CSV copiado" : "Copiar CSV"}
              </button>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(state.csv)}`}
                download={state.fileName ?? "assinaturas.csv"}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
              >
                <Download className="h-4 w-4" aria-hidden />
                Baixar {state.fileName ?? "assinaturas.csv"}
              </a>
            </div>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre rounded-lg border border-paper-line bg-paper p-3 font-mono text-xs leading-relaxed text-ink-soft">
            {state.csv}
          </pre>
        </div>
      )}
    </div>
  );
}
