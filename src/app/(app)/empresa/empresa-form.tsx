"use client";

import { useActionState } from "react";
import { Alert, Field, SubmitButton, Textarea } from "@/components/ui";
import { saveCompanyAction, type EmpresaState } from "./actions";

export type EmpresaDefaults = {
  name: string;
  legalName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  primaryColor: string;
  secondaryColor: string;
  contractPrefix: string;
  responsibleName: string | null;
};

export function EmpresaForm({ company }: { company: EmpresaDefaults }) {
  const [state, action, pending] = useActionState<EmpresaState, FormData>(saveCompanyAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && (
        <Alert tone="error">
          {state.error}
        </Alert>
      )}
      {state.success && (
        <Alert tone="success">
          {state.success}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome da empresa *"
          name="name"
          required
          defaultValue={company.name}
          placeholder="Social Sign LTDA"
          hint={errors.name}
        />
        <Field
          label="Razão social"
          name="legalName"
          defaultValue={company.legalName ?? ""}
          placeholder="Social Sign Serviços LTDA"
          hint={errors.legalName}
        />
        <Field
          label="CNPJ"
          name="cnpj"
          defaultValue={company.cnpj ?? ""}
          placeholder="12345678000199"
          hint={errors.cnpj ?? "Apenas números."}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={company.email ?? ""}
          placeholder="contato@empresa.com"
          hint={errors.email}
        />
        <Field
          label="Telefone"
          name="phone"
          defaultValue={company.phone ?? ""}
          placeholder="(11) 99999-0000"
          hint={errors.phone}
        />
        <Field
          label="Site"
          name="website"
          defaultValue={company.website ?? ""}
          placeholder="www.empresa.com"
          hint={errors.website}
        />
      </div>

      <Textarea
        label="Endereço"
        name="address"
        rows={3}
        defaultValue={company.address ?? ""}
        placeholder="Rua Exemplo, 123 — Centro — São Paulo/SP — CEP 01000-000"
        hint={errors.address}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="primaryColor" className="mb-1.5 block text-sm font-semibold">
            Cor primária
          </label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              defaultValue={company.primaryColor}
              className="h-11 w-16 cursor-pointer rounded-lg border border-paper-line bg-white p-1"
            />
            <span className="text-xs text-ink-mute">
              Usada em botões, destaques e cabeçalhos dos documentos.
            </span>
          </div>
          {errors.primaryColor && <p className="mt-1 text-xs text-bad">{errors.primaryColor}</p>}
        </div>

        <div>
          <label htmlFor="secondaryColor" className="mb-1.5 block text-sm font-semibold">
            Cor secundária
          </label>
          <div className="flex items-center gap-3">
            <input
              id="secondaryColor"
              name="secondaryColor"
              type="color"
              defaultValue={company.secondaryColor}
              className="h-11 w-16 cursor-pointer rounded-lg border border-paper-line bg-white p-1"
            />
            <span className="text-xs text-ink-mute">Usada em textos e rodapés dos documentos.</span>
          </div>
          {errors.secondaryColor && <p className="mt-1 text-xs text-bad">{errors.secondaryColor}</p>}
        </div>

        <Field
          label="Prefixo dos contratos *"
          name="contractPrefix"
          required
          defaultValue={company.contractPrefix}
          placeholder="SOC"
          hint={errors.contractPrefix ?? "De 2 a 10 letras ou números. Salvo em letras maiúsculas."}
        />
        <Field
          label="Nome do responsável"
          name="responsibleName"
          defaultValue={company.responsibleName ?? ""}
          placeholder="Nome de quem assina os contratos"
          hint={errors.responsibleName}
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} pendingText="Salvando...">
          Salvar alterações
        </SubmitButton>
      </div>
    </form>
  );
}
