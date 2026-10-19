"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { updateContractAction } from "../actions";
import type { ContractFormState } from "../../shared";

export function EditarForm({
  contractId,
  initialTitle,
  initialValue,
  initialStartDate,
  initialEndDate,
  variables,
  initialVariables,
  lastVersionNumber,
  lastVersionLocked,
}: {
  contractId: string;
  initialTitle: string;
  initialValue: string;
  initialStartDate: string;
  initialEndDate: string;
  variables: { key: string; label: string }[];
  initialVariables: Record<string, string>;
  lastVersionNumber: number;
  lastVersionLocked: boolean;
}) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(
    updateContractAction,
    {}
  );

  const [title, setTitle] = useState(initialTitle);
  const [value, setValue] = useState(initialValue);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [values, setValues] = useState<Record<string, string>>(initialVariables);

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="variables" value={JSON.stringify(values)} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      {lastVersionLocked && (
        <p className="rounded-lg bg-warn-tint px-3.5 py-2.5 text-sm text-warn">
          A versão {lastVersionNumber} está travada e será mantida intacta. As alterações serão
          salvas na versão {lastVersionNumber + 1}.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="mb-1.5 block text-sm font-semibold">
            Título <span className="text-bad">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`field ${fieldError("title") ? "border-bad" : ""}`}
          />
          {fieldError("title") && <p className="mt-1 text-xs text-bad">{fieldError("title")}</p>}
        </div>

        <div>
          <label htmlFor="value" className="mb-1.5 block text-sm font-semibold">
            Valor (R$)
          </label>
          <input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`field ${fieldError("value") ? "border-bad" : ""}`}
          />
          {fieldError("value") && <p className="mt-1 text-xs text-bad">{fieldError("value")}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="mb-1.5 block text-sm font-semibold">
              Início
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1.5 block text-sm font-semibold">
              Término
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold">Variáveis do documento</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Estes valores são substituídos no modelo e salvos na nova versão.
        </p>

        {variables.length === 0 ? (
          <p className="mt-4 rounded-lg bg-paper px-3.5 py-2.5 text-sm text-ink-mute">
            Este contrato não possui variáveis.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {variables.map((v) => (
              <div key={v.key}>
                <label htmlFor={`edit-var-${v.key}`} className="mb-1.5 block text-sm font-semibold">
                  {v.label}
                </label>
                <input
                  id={`edit-var-${v.key}`}
                  type="text"
                  value={values[v.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                  placeholder={v.label}
                  className="field"
                />
                <p className="mt-1 text-xs text-ink-mute">{`{{${v.key}}}`}</p>
              </div>
            ))}
          </div>
        )}
        {fieldError("variables") && (
          <p className="mt-1 text-xs text-bad">{fieldError("variables")}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {pending ? "Salvando..." : "Salvar nova versão"}
        </button>
      </div>
    </form>
  );
}
