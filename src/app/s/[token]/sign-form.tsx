"use client";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Loader2, PenLine, ShieldCheck } from "lucide-react";
import { signContractAction, refuseContractAction, type SignState } from "./actions";
import { SignaturePad, type SignatureValue } from "./signature-pad";
import { SuccessAnimation } from "./sign-animations";
import { useSignProgress } from "./sign-flow";
import { FIELD_TYPE } from "@/lib/status";

type Field = {
  id: string;
  type: keyof typeof FIELD_TYPE;
  label: string | null;
  required: boolean;
};

export function SignForm({ token, fields, signerName }: { token: string; fields: Field[]; signerName: string }) {
  const [state, action, pending] = useActionState<SignState, FormData>(
    (prev, fd) => signContractAction(prev, fd, token),
    {}
  );
  const [refuseState, refuseAction, refusing] = useActionState<SignState, FormData>(
    (prev, fd) => refuseContractAction(prev, fd, token),
    {}
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, SignatureValue | null>>({});
  const [terms, setTerms] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);

  // A barra do topo avança conforme os dados obrigatórios vão sendo preenchidos.
  const { reach } = useSignProgress();
  const preenchido = fields.every((f) => {
    if (!f.required) return true;
    if (f.type === "SIGNATURE") return !!signatures[f.id];
    if (f.type === "CHECKBOX") return values[f.id] === "true";
    return !!values[f.id]?.trim();
  });
  useEffect(() => {
    if (preenchido) reach(2);
  }, [preenchido, reach]);
  useEffect(() => {
    if (state.success) reach(3);
  }, [state.success, reach]);

  if (state.success) {
    return (
      <SuccessAnimation>
        Uma cópia do documento com a assinatura foi registrada, junto de data, hora, IP e
        dispositivo. Você pode fechar esta página com segurança.
      </SuccessAnimation>
    );
  }

  if (state.refused) {
    return (
      <div className="ss-pop rounded-xl border border-warn/30 bg-warn-tint p-6 text-center">
        <p className="text-lg font-extrabold text-warn">{state.refused}</p>
      </div>
    );
  }

  const payload = JSON.stringify(
    fields.map((f) => {
      if (f.type === "SIGNATURE") {
        const sig = signatures[f.id];
        return {
          fieldId: f.id,
          type: f.type,
          value: sig?.method === "DRAWN" ? sig.imageKey : sig?.typedName ?? "",
          method: sig?.method,
        };
      }
      return { fieldId: f.id, type: f.type, value: values[f.id] ?? "" };
    })
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="fields" value={payload} />
      <input type="hidden" name="terms" value={terms ? "1" : ""} />

      {fields.length === 0 ? (
        <p className="rounded-lg bg-paper px-3.5 py-2.5 text-sm text-ink-soft">
          Este documento não possui campos de preenchimento. Confirme abaixo para registrar sua concordância.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((f, i) => (
            <div
              key={f.id}
              className="ss-pop"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {f.type === "SIGNATURE" ? (
                <SignaturePad
                  name={`field_${f.id}`}
                  label={f.label || "Assinatura"}
                  value={signatures[f.id] ?? null}
                  onChange={(v) => setSignatures((s) => ({ ...s, [f.id]: v }))}
                />
              ) : f.type === "CHECKBOX" ? (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-paper-line bg-white p-4">
                  <input
                    type="checkbox"
                    checked={values[f.id] === "true"}
                    onChange={(e) => setValues((s) => ({ ...s, [f.id]: e.target.checked ? "true" : "" }))}
                    className="mt-0.5 h-4 w-4 rounded border-paper-line text-cobalt"
                  />
                  <span className="text-sm font-medium">{f.label || FIELD_TYPE[f.type]}</span>
                </label>
              ) : (
                <div className="rounded-xl border border-paper-line bg-white p-4">
                  <label htmlFor={`field_${f.id}`} className="mb-1.5 block text-sm font-semibold">
                    {f.label || FIELD_TYPE[f.type]}
                    {f.required && <span className="ml-1 text-bad">*</span>}
                  </label>
                  <input
                    id={`field_${f.id}`}
                    type={f.type === "DATE" ? "date" : "text"}
                    value={values[f.id] ?? ""}
                    onChange={(e) => setValues((s) => ({ ...s, [f.id]: e.target.value }))}
                    placeholder={f.type === "FULL_NAME" ? "Nome completo" : f.type === "CPF" ? "000.000.000-00" : ""}
                    className="field"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-paper-line bg-white p-4 transition-all duration-200 hover:border-cobalt/40 hover:shadow-sm">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-paper-line text-cobalt"
        />
        <span className="text-sm text-ink-soft">
          Declaro que concordo com o conteúdo deste documento e que a assinatura registrada neste ato é de minha
          responsabilidade, contendo data, hora, IP e dispositivo registrados.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="ss-pop rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !terms}
        className="btn h-12 w-full shadow-lg shadow-cobalt/20 transition-all duration-200 hover:shadow-xl hover:shadow-cobalt/30 active:scale-[0.99]"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Registrando sua assinatura...
          </>
        ) : (
          <>
            <PenLine className="h-4 w-4" aria-hidden />
            Assinar documento
          </>
        )}
      </button>
      {!terms && (
        <p className="text-center text-xs text-ink-mute">Marque a caixa de concordância para habilitar a assinatura.</p>
      )}

      <div className="border-t border-paper-line pt-4">
        {!showRefuse ? (
          <button
            type="button"
            onClick={() => setShowRefuse(true)}
            className="text-sm font-semibold text-ink-mute underline-offset-2 hover:text-bad hover:underline"
          >
            Recusar assinatura
          </button>
        ) : (
          <form action={refuseAction} className="space-y-2">
            <label htmlFor="reason" className="block text-sm font-semibold">
              Motivo da recusa
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
              placeholder="Explique o motivo da recusa"
              className="field h-auto py-2.5"
            />
            {refuseState.error && (
              <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
                {refuseState.error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={refusing} className="inline-flex h-10 items-center gap-2 rounded-lg bg-bad px-4 text-sm font-semibold text-white">
                {refusing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Confirmar recusa
              </button>
              <button
                type="button"
                onClick={() => setShowRefuse(false)}
                className="inline-flex h-10 items-center rounded-lg border border-paper-line px-4 text-sm font-semibold text-ink-soft"
              >
                Voltar
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-mute">
        <ShieldCheck className="h-3.5 w-3.5" /> Registro criptografado com data, IP e dispositivo
      </p>
    </form>
  );
}
