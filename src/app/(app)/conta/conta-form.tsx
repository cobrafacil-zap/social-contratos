"use client";

import { useActionState } from "react";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { changePasswordAction, updateProfileAction, type ContaState } from "./actions";

export type ContaUser = {
  name: string;
  email: string;
  roleLabel: string;
  companyName: string;
};

export function ProfileForm({ user }: { user: ContaUser }) {
  const [state, action, pending] = useActionState<ContaState, FormData>(updateProfileAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome *"
          name="name"
          required
          autoComplete="name"
          defaultValue={user.name}
          hint={errors.name}
        />
        <Field
          label="E-mail *"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={user.email}
          hint={errors.email}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="perfil-papel" className="mb-1.5 block text-sm font-semibold">
            Papel
          </label>
          <input
            id="perfil-papel"
            name="perfil-papel"
            type="text"
            value={user.roleLabel}
            readOnly
            disabled
            className="field bg-paper text-ink-mute"
          />
          <p className="mt-1 text-xs text-ink-mute">
            Somente um administrador da empresa pode alterar papéis.
          </p>
        </div>
        <div>
          <label htmlFor="perfil-empresa" className="mb-1.5 block text-sm font-semibold">
            Empresa
          </label>
          <input
            id="perfil-empresa"
            name="perfil-empresa"
            type="text"
            value={user.companyName}
            readOnly
            disabled
            className="field bg-paper text-ink-mute"
          />
          <p className="mt-1 text-xs text-ink-mute">
            Os dados da empresa são alterados em “Minha empresa”.
          </p>
        </div>
      </div>

      <SubmitButton pending={pending} pendingText="Salvando...">
        Salvar dados
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ContaState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Senha atual *"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          hint="Informe a senha usada para entrar no sistema."
        />
        <div />
        <Field
          label="Nova senha *"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          hint="Mínimo de 12 caracteres."
        />
        <Field
          label="Confirmar nova senha *"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <SubmitButton pending={pending} pendingText="Alterando...">
        Alterar senha
      </SubmitButton>
    </form>
  );
}
