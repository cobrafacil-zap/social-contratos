"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Card, CardHeader, SubmitButton } from "@/components/ui";
import { extractVariables, humanizeVar } from "@/lib/contract";
import type { TemplateState } from "./actions";

export type ModeloFormInitial = {
  name: string;
  category: string;
  html: string;
  headerHtml: string;
  footerHtml: string;
};

type TemplateAction = (state: TemplateState, formData: FormData) => Promise<TemplateState>;

/** Realça as variáveis {{var}} dentro do HTML usado no preview. */
function highlightVariables(html: string): string {
  return html.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    '<mark class="rounded bg-cobalt-tint px-1 py-0.5 font-mono text-[13px] text-cobalt">{{$1}}</mark>',
  );
}

export function ModeloForm({
  action,
  initial,
  categories = [],
  submitLabel = "Salvar modelo",
  pendingText = "Salvando...",
  cancelHref = "/modelos",
}: {
  action: TemplateAction;
  initial?: ModeloFormInitial;
  categories?: string[];
  submitLabel?: string;
  pendingText?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<TemplateState, FormData>(action, {});
  const [html, setHtml] = useState(initial?.html ?? "");

  const variables = useMemo(() => extractVariables(html), [html]);
  const previewHtml = useMemo(() => highlightVariables(html), [html]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <Card>
        <CardHeader title="Identificação" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
              Nome do modelo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={initial?.name ?? ""}
              required
              minLength={2}
              maxLength={120}
              placeholder="Ex.: Prestação de Serviços"
              className="field"
            />
            <p className="mt-1 text-xs text-ink-mute">Como o modelo aparecerá na lista de contratos.</p>
          </div>

          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-semibold">
              Categoria
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={initial?.category ?? ""}
              maxLength={60}
              list="modelos-categorias"
              placeholder="Ex.: Serviços"
              className="field"
            />
            <datalist id="modelos-categorias">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-ink-mute">
              Opcional. Ajuda a organizar e filtrar os modelos da empresa.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Conteúdo do modelo (HTML)"
          action={
            <span className="text-xs text-ink-mute">
              {html.length} caracteres · {variables.length} variáveis
            </span>
          }
        />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <label htmlFor="contentHtml" className="mb-1.5 block text-sm font-semibold">
              HTML do contrato *
            </label>
            <textarea
              id="contentHtml"
              name="contentHtml"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              required
              minLength={20}
              rows={22}
              spellCheck={false}
              placeholder="<h1>Contrato de Prestação de Serviços</h1><p>Entre {{empresa_nome}} e {{cliente_nome}}...</p>"
              className="field h-auto py-2.5 font-mono text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-xs text-ink-mute">
              Use variáveis entre chaves duplas, como <code className="font-mono">{"{{cliente_nome}}"}</code>.
            </p>
          </div>

          <div>
            <p className="mb-1.5 block text-sm font-semibold">Pré-visualização</p>
            <div className="min-h-[420px] overflow-auto rounded-lg border border-paper-line bg-paper-card p-5">
              {html.trim().length > 0 ? (
                <div
                  className="max-w-none text-[15px] leading-relaxed text-ink-soft [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-ink [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mb-3 [&_ul]:mt-2"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-sm text-ink-mute">O preview aparece aqui enquanto você digita o HTML.</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-paper-line px-5 py-4">
          <p className="text-sm font-semibold">
            Variáveis detectadas{" "}
            <span className="font-normal text-ink-mute">({variables.length})</span>
          </p>
          {variables.length === 0 ? (
            <p className="mt-1 text-sm text-ink-mute">
              Nenhuma variável encontrada. Escreva {"{{variavel}}"} para criar campos preenchíveis no
              contrato.
            </p>
          ) : (
            <>
              <ul className="mt-2 flex flex-wrap gap-2">
                {variables.map((v) => (
                  <li
                    key={v}
                    className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper px-2.5 py-1 text-xs"
                  >
                    <span className="font-semibold text-ink">{humanizeVar(v)}</span>
                    <code className="font-mono text-[11px] text-cobalt">{`{{${v}}}`}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-mute">
                Estas variáveis serão preenchidas automaticamente na criação do contrato.
              </p>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Cabeçalho e rodapé" />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <label htmlFor="headerHtml" className="mb-1.5 block text-sm font-semibold">
              Cabeçalho (HTML)
            </label>
            <textarea
              id="headerHtml"
              name="headerHtml"
              defaultValue={initial?.headerHtml ?? ""}
              rows={6}
              spellCheck={false}
              placeholder="<p>{{empresa_nome}}</p>"
              className="field h-auto py-2.5 font-mono text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-xs text-ink-mute">Opcional. Aparece no topo de cada página.</p>
          </div>

          <div>
            <label htmlFor="footerHtml" className="mb-1.5 block text-sm font-semibold">
              Rodapé (HTML)
            </label>
            <textarea
              id="footerHtml"
              name="footerHtml"
              defaultValue={initial?.footerHtml ?? ""}
              rows={6}
              spellCheck={false}
              placeholder="<p>{{empresa_nome}} — página 1 de 1</p>"
              className="field h-auto py-2.5 font-mono text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-xs text-ink-mute">Opcional. Aparece no rodapé de cada página.</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} pendingText={pendingText}>
          {submitLabel}
        </SubmitButton>
        <Link
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-card px-5 text-[15px] font-semibold text-ink-soft hover:bg-paper"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
