"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" placeholder="voce@empresa.com" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
