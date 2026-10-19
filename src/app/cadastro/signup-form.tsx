"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signupAction, type SignupState } from "./actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="companyName" className="mb-1.5 block text-sm font-semibold">
          Nome da empresa
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={100}
          className="field"
          placeholder="Minha Empresa Ltda"
        />
      </div>

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
          Seu nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          className="field"
          placeholder="João Silva"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          E-mail corporativo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="field"
          placeholder="voce@empresa.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
          className="field"
          placeholder="Mínimo 12 caracteres"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="rounded-lg bg-ok-tint px-3.5 py-2.5 text-sm text-ok">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
