"use client";

import { useActionState } from "react";
import { Alert, Checkbox, Field, SubmitButton } from "@/components/ui";
import { saveSettingsAction, type SettingsState } from "./actions";

export type SettingsDefaults = {
  defaultValidityDays: number;
  notifyClientByEmail: boolean;
  requireTermsAcceptance: boolean;
  accentColor: string;
};

export function ConfigForm({ settings }: { settings: SettingsDefaults }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Dias padrão de validade dos contratos"
          name="defaultValidityDays"
          type="number"
          min={1}
          max={365}
          step={1}
          defaultValue={settings.defaultValidityDays}
          hint={errors.defaultValidityDays ?? "Prazo padrão aplicado aos novos contratos (1 a 365 dias)."}
        />
        <div>
          <label htmlFor="accentColor" className="mb-1.5 block text-sm font-semibold">
            Cor de destaque
          </label>
          <div className="flex items-center gap-3">
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={settings.accentColor}
              className="h-11 w-16 cursor-pointer rounded-lg border border-paper-line bg-white p-1"
            />
            <span className="text-xs text-ink-mute">Usada nos elementos de destaque do sistema.</span>
          </div>
          {errors.accentColor && <p className="mt-1 text-xs text-bad">{errors.accentColor}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-paper-line bg-paper/40 p-4">
        <Checkbox
          label="Notificar o cliente por e-mail ao enviar"
          name="notifyClientByEmail"
          defaultChecked={settings.notifyClientByEmail}
          hint="Dispara um e-mail para o cliente sempre que um contrato for enviado para assinatura."
        />
        <Checkbox
          label="Exigir aceite dos termos antes de assinar"
          name="requireTermsAcceptance"
          defaultChecked={settings.requireTermsAcceptance}
          hint="O assinante precisa marcar a aceitação dos termos antes de registrar a assinatura."
        />
      </div>

      <SubmitButton pending={pending} pendingText="Salvando...">
        Salvar preferências
      </SubmitButton>
    </form>
  );
}
