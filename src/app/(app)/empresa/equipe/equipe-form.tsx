"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Field, Select, SubmitButton } from "@/components/ui";
import { ROLE } from "@/lib/status";
import {
  changeUserRoleAction,
  createUserAction,
  toggleUserStatusAction,
  type EquipeState,
} from "./actions";

const ROLE_OPTIONS = Object.entries(ROLE).map(([value, label]) => ({ value, label }));

export function UserRoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, action, pending] = useActionState<EquipeState, FormData>(
    changeUserRoleAction.bind(null, userId),
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <select
        name="role"
        defaultValue={role}
        aria-label="Papel do usuário"
        className="h-9 w-auto min-w-[9.5rem] rounded-lg border border-paper-line bg-card px-3 text-sm text-ink transition-colors focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-9 shrink-0 rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper disabled:opacity-60"
      >
        {pending ? "..." : "Salvar"}
      </button>
      {state.error && <span className="text-xs text-bad">{state.error}</span>}
      {state.success && <span className="text-xs text-ok">{state.success}</span>}
    </form>
  );
}

export function UserStatusForm({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<EquipeState, FormData>(
    toggleUserStatusAction.bind(null, userId),
    {},
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending || isSelf}
        title={isSelf ? "Você não pode desativar a sua própria conta" : undefined}
        className={
          isActive
            ? "h-9 rounded-lg bg-bad px-3 text-sm font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            : "h-9 rounded-lg border border-paper-line bg-card px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pending ? "..." : isActive ? "Desativar" : "Ativar"}
      </button>
      {isSelf && <span className="text-xs text-ink-mute">Você não pode desativar a si mesmo</span>}
      {state.error && <span className="text-xs text-bad">{state.error}</span>}
      {state.success && <span className="text-xs text-ok">{state.success}</span>}
    </form>
  );
}

export function AddUserForm() {
  const [state, action, pending] = useActionState<EquipeState, FormData>(createUserAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.createdEmail) formRef.current?.reset();
  }, [state.createdEmail]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !state.createdEmail && <Alert tone="success">{state.success}</Alert>}

      {state.createdEmail && state.createdPassword && (
        <Alert tone="success">
          <p className="font-semibold">Usuário criado com sucesso.</p>
          <p className="mt-1">Copie os dados abaixo e envie ao usuário — o app não envia e-mails.</p>
          <dl className="mt-2 space-y-1 rounded-lg bg-paper px-3 py-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-semibold">E-mail:</dt>
              <dd className="font-mono break-all">{state.createdEmail}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Senha provisória:</dt>
              <dd className="font-mono break-all">{state.createdPassword}</dd>
            </div>
          </dl>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" name="name" required placeholder="João Silva" />
        <Field
          label="E-mail *"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="joao@empresa.com"
        />
        <Field
          label="Senha provisória *"
          name="password"
          type="text"
          required
          autoComplete="new-password"
          placeholder="Mínimo 12 caracteres"
          hint="Anote a senha: ela será exibida em texto após a criação."
        />
        <Select
          label="Papel *"
          name="role"
          required
          defaultValue="EMPLOYEE"
          options={ROLE_OPTIONS}
        />
      </div>

      <SubmitButton pending={pending} pendingText="Criando...">
        Adicionar usuário
      </SubmitButton>
    </form>
  );
}
