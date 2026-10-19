"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { createContractAction } from "./actions";
import {
  fieldErrorsFrom,
  formatDateInput,
  step1Schema,
  step2Schema,
  step3Schema,
  type ClientOption,
  type CompanyOption,
  type ContractFormState,
  type SignerInput,
  type TemplateOption,
  type VaultOption,
} from "./shared";

const STEPS = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Cofre" },
  { id: 3, label: "Variáveis e signatários" },
] as const;

const ROLE_SUGGESTIONS = ["Contratante", "Contratada", "Testemunha", "Representante legal", "Responsável"];

const EMPTY_SIGNER: SignerInput = { name: "", email: "", role: "Contratante" };

export function ContratoForm({
  clients,
  templates,
  vaults,
  company,
  defaultTemplateId,
  defaultClientId,
}: {
  clients: ClientOption[];
  templates: TemplateOption[];
  vaults: VaultOption[];
  company: CompanyOption;
  defaultTemplateId?: string;
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(createContractAction, {});
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");

  const [vaultId, setVaultId] = useState(vaults.find((v) => v.isDefault)?.id ?? "");
  const [newVaultName, setNewVaultName] = useState("");
  const [newVaultDescription, setNewVaultDescription] = useState("");

  const [variables, setVariables] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [signers, setSigners] = useState<SignerInput[]>([{ ...EMPTY_SIGNER }]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );
  const templateKeys = useMemo(
    () => (selectedTemplate?.variables ?? []).map((v) => v.key),
    [selectedTemplate]
  );

  const suggestions = useMemo<Record<string, string>>(() => {
    const address = [
      selectedClient?.address,
      selectedClient?.city,
      selectedClient?.state,
      selectedClient?.zip,
    ]
      .filter(Boolean)
      .join(", ");
    return {
      empresa_nome: company.name,
      empresa_razao_social: company.legalName ?? company.name,
      empresa_cnpj: company.cnpj ?? "",
      cnpj: company.cnpj ?? "",
      empresa_endereco: company.address ?? "",
      empresa_telefone: company.phone ?? "",
      empresa_email: company.email ?? "",
      cliente_nome: selectedClient?.name ?? "",
      cliente_documento: selectedClient?.document ?? "",
      cliente_email: selectedClient?.email ?? "",
      cliente_empresa: selectedClient?.companyName ?? "",
      cliente_endereco: address,
      cliente_cidade: selectedClient?.city ?? "",
      cliente_uf: selectedClient?.state ?? "",
      cliente_cep: selectedClient?.zip ?? "",
      valor: value ? formatCurrency(value) : "",
      data_inicio: startDate ? formatDateInput(startDate) : "",
      data_fim: endDate ? formatDateInput(endDate) : "",
    };
  }, [company, selectedClient, value, startDate, endDate]);

  // Mantém as variáveis em sincronia com o modelo escolhido e com os valores
  // sugeridos — valores já editados pelo usuário não são sobrescritos.
  useEffect(() => {
    setVariables((prev) => {
      const next: Record<string, string> = {};
      for (const key of templateKeys) {
        next[key] = touched[key] ? (prev[key] ?? "") : (suggestions[key] ?? "");
      }
      return next;
    });
  }, [templateKeys, suggestions, touched]);

  // Volta ao passo com erro quando o servidor rejeita o formulário.
  useEffect(() => {
    if (state.invalidStep) setStep(state.invalidStep);
    if (state.fieldErrors) setErrors(state.fieldErrors);
  }, [state]);

  const fieldError = (name: string) => state.fieldErrors?.[name] ?? errors[name];

  function validateStep(target: 1 | 2 | 3): boolean {
    if (target === 1) {
      const parsed = step1Schema.safeParse({
        clientId,
        title,
        templateId,
        value,
        startDate,
        endDate,
        expiresInDays,
      });
      if (!parsed.success) {
        setErrors(fieldErrorsFrom(parsed.error));
        return false;
      }
    } else if (target === 2) {
      const parsed = step2Schema.safeParse({ vaultId, newVaultName, newVaultDescription });
      if (!parsed.success) {
        setErrors(fieldErrorsFrom(parsed.error));
        return false;
      }
    } else {
      const parsed = step3Schema.safeParse({ variables, signers });
      if (!parsed.success) {
        setErrors(fieldErrorsFrom(parsed.error));
        return false;
      }
    }
    setErrors({});
    return true;
  }

  function goTo(target: 1 | 2 | 3) {
    if (!validateStep(target)) return;
    setStep(target);
  }

  function setVariable(key: string, val: string) {
    setVariables((prev) => ({ ...prev, [key]: val }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function updateSigner(index: number, patch: Partial<SignerInput>) {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSigner() {
    setSigners((prev) => [...prev, { ...EMPTY_SIGNER }]);
  }

  function removeSigner(index: number) {
    setSigners((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const inputClass = (name: string) =>
    `field ${fieldError(name) ? "border-bad focus:border-bad focus:ring-bad/20" : ""}`;

  return (
    <form action={formAction} noValidate className="space-y-6">
      <input type="hidden" name="variables" value={JSON.stringify(variables)} />
      <input type="hidden" name="signers" value={JSON.stringify(signers)} />

      {/* Indicador de passos */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (done ? setStep(s.id) : goTo(s.id))}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-cobalt text-white"
                    : done
                      ? "bg-cobalt-tint text-cobalt"
                      : "bg-white text-ink-mute ring-1 ring-paper-line"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    active ? "bg-white/20" : done ? "bg-cobalt/15" : "bg-paper"
                  }`}
                >
                  {s.id}
                </span>
                {s.label}
              </button>
              {s.id < 3 && <span className="h-px w-4 bg-paper-line" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      {/* ------------------------------ PASSO 1 ------------------------------ */}
      <section hidden={step !== 1} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="clientId" className="mb-1.5 block text-sm font-semibold">
              Cliente <span className="text-bad">*</span>
            </label>
            <select
              id="clientId"
              name="clientId"
              value={clientId}
              onChange={(e) => {
                const next = e.target.value;
                setClientId(next);
                if (next === "__novo__") router.push("/clientes/novo");
              }}
              className={inputClass("clientId")}
            >
              <option value="">Selecione o cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.document ? ` — ${c.document}` : ""}
                </option>
              ))}
              <option value="__novo__">＋ Novo cliente</option>
            </select>
            {clientId === "__novo__" ? (
              <p className="mt-1.5 text-xs text-ink-mute">
                <Link href="/clientes/novo" className="font-semibold text-cobalt underline">
                  Cadastrar novo cliente
                </Link>{" "}
                — você voltará para esta página depois.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-mute">
                Não acha o cliente?{" "}
                <Link href="/clientes/novo" className="font-semibold text-cobalt underline">
                  Cadastre agora
                </Link>
                .
              </p>
            )}
            {fieldError("clientId") && (
              <p className="mt-1 text-xs text-bad">{fieldError("clientId")}</p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-semibold">
              Título do contrato <span className="text-bad">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contrato de prestação de serviços"
              className={inputClass("title")}
            />
            {fieldError("title") && <p className="mt-1 text-xs text-bad">{fieldError("title")}</p>}
          </div>

          <div>
            <label htmlFor="templateId" className="mb-1.5 block text-sm font-semibold">
              Modelo
            </label>
            <select
              id="templateId"
              name="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={inputClass("templateId")}
            >
              <option value="">Sem modelo (documento padrão)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.category ? ` — ${t.category}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-mute">
              O modelo define as variáveis que serão preenchidas no passo 3.
            </p>
            {fieldError("templateId") && (
              <p className="mt-1 text-xs text-bad">{fieldError("templateId")}</p>
            )}
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
              placeholder="0,00"
              className={inputClass("value")}
            />
            {fieldError("value") && <p className="mt-1 text-xs text-bad">{fieldError("value")}</p>}
          </div>

          <div>
            <label htmlFor="startDate" className="mb-1.5 block text-sm font-semibold">
              Data de início
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass("startDate")}
            />
            {fieldError("startDate") && (
              <p className="mt-1 text-xs text-bad">{fieldError("startDate")}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="mb-1.5 block text-sm font-semibold">
              Data de término
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass("endDate")}
            />
            {fieldError("endDate") && <p className="mt-1 text-xs text-bad">{fieldError("endDate")}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="expiresInDays" className="mb-1.5 block text-sm font-semibold">
              Prazo de validade (dias)
            </label>
            <input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min="0"
              step="1"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className={inputClass("expiresInDays")}
            />
            <p className="mt-1.5 text-xs text-ink-mute">
              Define até quando o contrato pode ser assinado. Deixe em branco para não expirar.
            </p>
            {fieldError("expiresInDays") && (
              <p className="mt-1 text-xs text-bad">{fieldError("expiresInDays")}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => goTo(2)} className="btn">
            Avançar <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>

      {/* ------------------------------ PASSO 2 ------------------------------ */}
      <section hidden={step !== 2} className="space-y-5">
        <div>
          <label htmlFor="vaultId" className="mb-1.5 block text-sm font-semibold">
            Cofre de documentos
          </label>
          <select
            id="vaultId"
            name="vaultId"
            value={vaultId}
            onChange={(e) => setVaultId(e.target.value)}
            className={inputClass("vaultId")}
          >
            <option value="">Nenhum</option>
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.isDefault ? " (padrão)" : ""}
              </option>
            ))}
            <option value="__novo__">＋ Criar novo cofre</option>
          </select>
          {vaultId === "__novo__" && (
            <div className="mt-4 space-y-4 rounded-lg border border-dashed border-paper-line bg-paper/60 p-4">
              <div>
                <label htmlFor="newVaultName" className="mb-1.5 block text-sm font-semibold">
                  Nome do cofre <span className="text-bad">*</span>
                </label>
                <input
                  id="newVaultName"
                  name="newVaultName"
                  type="text"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  placeholder="Ex.: Contratos 2026"
                  className={inputClass("newVaultName")}
                />
                {fieldError("newVaultName") && (
                  <p className="mt-1 text-xs text-bad">{fieldError("newVaultName")}</p>
                )}
              </div>
              <div>
                <label htmlFor="newVaultDescription" className="mb-1.5 block text-sm font-semibold">
                  Descrição
                </label>
                <input
                  id="newVaultDescription"
                  name="newVaultDescription"
                  type="text"
                  value={newVaultDescription}
                  onChange={(e) => setNewVaultDescription(e.target.value)}
                  placeholder="Opcional"
                  className={inputClass("newVaultDescription")}
                />
              </div>
              <p className="text-xs text-ink-mute">
                Se ainda não existir um cofre padrão, este novo cofre será marcado como padrão.
              </p>
            </div>
          )}
          {fieldError("vaultId") && <p className="mt-1 text-xs text-bad">{fieldError("vaultId")}</p>}
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={() => goTo(1)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft hover:bg-paper">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
          </button>
          <button type="button" onClick={() => goTo(3)} className="btn">
            Avançar <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>

      {/* ------------------------------ PASSO 3 ------------------------------ */}
      <section hidden={step !== 3} className="space-y-6">
        <div>
          <h2 className="text-base font-bold">Variáveis do modelo</h2>
          <p className="mt-1 text-sm text-ink-mute">
            {templateKeys.length > 0
              ? "Confira os valores que serão substituídos no documento."
              : "Este contrato não possui variáveis. Selecione um modelo no passo 1 para editar as variáveis."}
          </p>

          {templateKeys.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {selectedTemplate?.variables.map((v) => (
                <div key={v.key}>
                  <label htmlFor={`var-${v.key}`} className="mb-1.5 block text-sm font-semibold">
                    {v.label}
                  </label>
                  <input
                    id={`var-${v.key}`}
                    name={`var_${v.key}`}
                    type="text"
                    value={variables[v.key] ?? ""}
                    onChange={(e) => setVariable(v.key, e.target.value)}
                    placeholder={`${v.label}`}
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

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Signatários</h2>
            <button
              type="button"
              onClick={addSigner}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
            >
              <Plus className="h-4 w-4" aria-hidden /> Adicionar signatário
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-mute">
            Os signatários são avisados e criam a assinatura quando o contrato for enviado.
          </p>

          <ul className="mt-4 space-y-3">
            {signers.map((signer, index) => (
              <li key={index} className="rounded-lg border border-paper-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Signatário {index + 1}</p>
                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-bad hover:bg-bad-tint"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Remover
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor={`signer-name-${index}`} className="mb-1.5 block text-sm font-semibold">
                      Nome <span className="text-bad">*</span>
                    </label>
                    <input
                      id={`signer-name-${index}`}
                      type="text"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, { name: e.target.value })}
                      placeholder="Nome completo"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`signer-email-${index}`} className="mb-1.5 block text-sm font-semibold">
                      E-mail <span className="text-bad">*</span>
                    </label>
                    <input
                      id={`signer-email-${index}`}
                      type="email"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, { email: e.target.value })}
                      placeholder="nome@empresa.com"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`signer-role-${index}`} className="mb-1.5 block text-sm font-semibold">
                      Papel
                    </label>
                    <input
                      id={`signer-role-${index}`}
                      type="text"
                      list="signer-roles"
                      value={signer.role}
                      onChange={(e) => updateSigner(index, { role: e.target.value })}
                      placeholder="Contratante"
                      className="field"
                    />
                  </div>
                </div>
                {errors.signers && <p className="mt-2 text-xs text-bad">{errors.signers}</p>}
              </li>
            ))}
          </ul>
          <datalist id="signer-roles">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(2)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft hover:bg-paper"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
          </button>
          <button
            type="submit"
            disabled={pending}
            onClick={(e) => {
              if (!validateStep(3)) {
                // evita o submit quando os signatários estão inválidos
                e.preventDefault();
              }
            }}
            className="btn"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? "Criando contrato..." : "Criar contrato"}
          </button>
        </div>
      </section>
    </form>
  );
}
