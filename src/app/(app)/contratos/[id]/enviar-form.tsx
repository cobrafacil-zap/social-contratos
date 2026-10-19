"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { sendForSignatureAction } from "./actions";
import { CopyLink } from "./copy-link";
import type { SendContractState, SignerInput } from "../shared";

const ROLE_SUGGESTIONS = ["Contratante", "Contratada", "Testemunha", "Representante legal", "Responsável"];

/**
 * Formulário de envio para assinatura: define os signatários e, após o envio,
 * exibe os links de assinatura para envio manual (o token em claro não é salvo).
 */
export function EnviarForm({
  contractId,
  initialSigners,
}: {
  contractId: string;
  initialSigners: SignerInput[];
}) {
  const [state, formAction, pending] = useActionState<SendContractState, FormData>(
    sendForSignatureAction,
    {}
  );
  const [signers, setSigners] = useState<SignerInput[]>(
    initialSigners.length > 0 ? initialSigners : [{ name: "", email: "", role: "Contratante" }]
  );

  function updateSigner(index: number, patch: Partial<SignerInput>) {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="signers" value={JSON.stringify(signers)} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <ul className="space-y-3">
        {signers.map((signer, index) => (
          <li key={index} className="rounded-lg border border-paper-line bg-paper/60 p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor={`send-name-${index}`} className="mb-1.5 block text-sm font-semibold">
                  Nome <span className="text-bad">*</span>
                </label>
                <input
                  id={`send-name-${index}`}
                  type="text"
                  value={signer.name}
                  onChange={(e) => updateSigner(index, { name: e.target.value })}
                  placeholder="Nome completo"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor={`send-email-${index}`} className="mb-1.5 block text-sm font-semibold">
                  E-mail <span className="text-bad">*</span>
                </label>
                <input
                  id={`send-email-${index}`}
                  type="email"
                  value={signer.email}
                  onChange={(e) => updateSigner(index, { email: e.target.value })}
                  placeholder="nome@empresa.com"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor={`send-role-${index}`} className="mb-1.5 block text-sm font-semibold">
                  Papel
                </label>
                <input
                  id={`send-role-${index}`}
                  type="text"
                  list="send-roles"
                  value={signer.role}
                  onChange={(e) => updateSigner(index, { role: e.target.value })}
                  placeholder="Contratante"
                  className="field"
                />
              </div>
            </div>
            {signers.length > 1 && (
              <button
                type="button"
                onClick={() => setSigners((prev) => prev.filter((_, i) => i !== index))}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-bad hover:bg-bad-tint"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remover
              </button>
            )}
          </li>
        ))}
      </ul>

      <datalist id="send-roles">
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setSigners((prev) => [...prev, { name: "", email: "", role: "Contratante" }])
          }
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
        >
          <Plus className="h-4 w-4" aria-hidden /> Adicionar signatário
        </button>
        <button type="submit" disabled={pending} className="btn">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {pending ? "Enviando..." : "Enviar para assinatura"}
        </button>
      </div>

      {state.links && state.links.length > 0 && (
        <div className="rounded-lg border border-ok/30 bg-ok-tint/60 p-4">
          <p className="text-sm font-bold text-ok">Links de assinatura gerados</p>
          <p className="mt-1 text-xs text-ink-soft">
            Envie cada link para o respectivo signatário. Por segurança, o link não será exibido
            novamente — o banco de dados guarda apenas o hash do token.
          </p>
          <ul className="mt-3 space-y-2">
            {state.links.map((link) => (
              <li key={link.url} className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {link.name} <span className="font-normal text-ink-mute">· {link.email}</span>
                  </p>
                  <p className="truncate font-mono text-xs text-ink-soft">{link.url}</p>
                </div>
                <CopyLink url={link.url} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
