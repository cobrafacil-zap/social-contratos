"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, Field, SubmitButton } from "@/components/ui";
import type { ClientFormState, ClientFormValues } from "./actions";

const EMPTY_VALUES: ClientFormValues = {
  name: "",
  responsibleName: "",
  email: "",
  document: "",
  phone: "",
  legalName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export function ClientForm({
  action,
  defaultValues,
  clientId,
  submitLabel = "Salvar cliente",
  pendingText = "Salvando…",
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaultValues?: Partial<ClientFormValues>;
  clientId?: string;
  submitLabel?: string;
  pendingText?: string;
}) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(action, {});

  const values: ClientFormValues = {
    ...EMPTY_VALUES,
    ...defaultValues,
    ...(state.values ?? {}),
  };

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {clientId && <input type="hidden" name="id" value={clientId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome da empresa do cliente"
          name="name"
          required
          defaultValue={values.name}
          placeholder="Ex.: Construtora Alfa Ltda."
          autoComplete="organization"
          hint="Como o cliente aparecerá na lista e nos contratos."
        />
        <Field
          label="Nome do responsável"
          name="responsibleName"
          required
          defaultValue={values.responsibleName}
          placeholder="Ex.: Maria Souza"
          autoComplete="name"
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          required
          defaultValue={values.email}
          placeholder="contato@cliente.com.br"
          autoComplete="email"
        />
        <Field
          label="Telefone"
          name="phone"
          type="tel"
          defaultValue={values.phone}
          placeholder="(11) 99999-0000"
          autoComplete="tel"
        />
        <Field
          label="Documento (CPF/CNPJ)"
          name="document"
          defaultValue={values.document}
          placeholder="Somente números"
          hint="Pontos, traços e barras são removidos ao salvar."
        />
        <Field
          label="Razão social"
          name="legalName"
          defaultValue={values.legalName}
          placeholder="Ex.: Construtora Alfa Comércio de Imóveis Ltda."
          hint="Se ficar em branco, usamos o nome do responsável."
        />
        <div className="sm:col-span-2">
          <Field
            label="Endereço"
            name="address"
            defaultValue={values.address}
            placeholder="Rua, número, complemento e bairro"
            autoComplete="street-address"
          />
        </div>
        <Field
          label="Cidade"
          name="city"
          defaultValue={values.city}
          placeholder="Ex.: São Paulo"
          autoComplete="address-level2"
        />
        <Field
          label="UF"
          name="state"
          defaultValue={values.state}
          placeholder="SP"
          hint="Exatamente 2 letras."
          autoComplete="address-level1"
        />
        <Field
          label="CEP"
          name="zip"
          defaultValue={values.zip}
          placeholder="Somente números"
          hint="Apenas dígitos."
          autoComplete="postal-code"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-paper-line pt-5">
        <SubmitButton pending={pending} pendingText={pendingText}>
          {submitLabel}
        </SubmitButton>
        <Link
          href="/clientes"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/**
 * Confirmação de exclusão do cliente.
 * Exige a marcação do checkbox e a confirmação do navegador antes de enviar.
 */
export function DeleteClientForm({
  action,
  clientId,
  clientName,
  contractCount = 0,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clientId: string;
  clientName: string;
  contractCount?: number;
}) {
  return (
    <details className="group rounded-xl border border-bad/30 bg-bad-tint/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-bad">
        Excluir cliente
      </summary>
      <form
        action={action}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Excluir o cliente "${clientName}"? O registro será removido da listagem e os contratos vinculados serão mantidos.`
          );
          if (!confirmed) event.preventDefault();
        }}
        className="space-y-3 border-t border-bad/20 px-4 py-4"
      >
        <input type="hidden" name="id" value={clientId} />
        <input type="hidden" name="confirm" value="1" />
        <p className="text-sm text-ink-soft">
          A exclusão é definitiva na listagem de clientes.
          {contractCount > 0
            ? ` Este cliente possui ${contractCount} contrato(s), que continuam em seu histórico.`
            : ""}
        </p>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            name="confirmDeletion"
            value="1"
            required
            className="mt-0.5 h-4 w-4 rounded border-paper-line text-bad focus:ring-bad/30"
          />
          <span className="text-sm font-medium">Confirmo a exclusão</span>
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-bad px-4 text-sm font-semibold text-white transition-colors hover:brightness-95"
        >
          Excluir cliente
        </button>
      </form>
    </details>
  );
}
