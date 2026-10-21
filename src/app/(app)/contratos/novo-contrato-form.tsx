"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Loader2, Mail, Sparkles } from "lucide-react";
import { SendSuccess } from "./send-success";
import {
  type ClientOption,
  type CompanyOption,
  type TemplateOption,
  type VaultOption,
} from "./shared";

/** Rótulos amigáveis usados nas mensagens de erro. */
const FIELD_LABELS: Record<string, string> = {
  clientName: "Nome do cliente",
  clientEmail: "E-mail do cliente",
  clientDocument: "CPF/CNPJ do cliente",
  clientAddress: "Endereço do cliente",
  title: "Título do contrato",
  templateId: "Modelo de contrato",
  value: "Valor",
  startDate: "Data de início",
  endDate: "Data de término",
  expiresInDays: "Prazo do link",
  signerName: "Nome de quem recebe o documento",
  signerEmail: "E-mail de quem recebe o documento",
  vaultId: "Cofre",
  newVaultName: "Nome do cofre",
};

/**
 * Criação de contrato em UMA tela só:
 * dados do cliente + modelo + valores + cofre + e-mail do signatário.
 * Ao enviar, o contrato é criado, o link de assinatura é gerado e o e-mail
 * sai automaticamente para o cliente.
 */
export function NovoContratoForm({
  clients,
  templates,
  vaults,
  company,
  defaultTemplateId,
  defaultClient,
}: {
  clients: ClientOption[];
  templates: TemplateOption[];
  vaults: VaultOption[];
  company: CompanyOption;
  defaultTemplateId?: string;
  defaultClient?: ClientOption | null;
}) {
  const [state, setState] = useState<{
    error?: string;
    fieldErrors?: Record<string, string>;
    success?: boolean;
    link?: string;
    emailed?: number;
    contractNumber?: string;
    signerEmail?: string;
  }>({});
  const [pending, setPending] = useState(false);

  const [clientName, setClientName] = useState(defaultClient?.name ?? "");
  const [clientEmail, setClientEmail] = useState(defaultClient?.email ?? "");
  const [clientDocument, setClientDocument] = useState(defaultClient?.document ?? "");
  const [clientAddress, setClientAddress] = useState(
    [defaultClient?.address, defaultClient?.city, defaultClient?.state, defaultClient?.zip]
      .filter(Boolean)
      .join(", ")
  );
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [signerName, setSignerName] = useState(defaultClient?.name ?? "");
  const [signerEmail, setSignerEmail] = useState(defaultClient?.email ?? "");
  const [vaultId, setVaultId] = useState(vaults.find((v) => v.isDefault)?.id ?? "");
  const [newVaultName, setNewVaultName] = useState("");
  const [showNewVault, setShowNewVault] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const fieldError = (name: string) => state.fieldErrors?.[name];

  // Ao escolher o modelo, sugere o título e o signatário principal.
  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setTitle((prev) => prev || t.name);
  }

  /** Envia os dados para a API, que cria o contrato e dispara o e-mail. */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({});
    try {
      const fd = new FormData(e.currentTarget);
      const payload = Object.fromEntries(fd.entries()) as Record<string, string>;
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setState(data);
      if (!res.ok) {
        setState({ error: data.error, fieldErrors: data.fieldErrors });
      }
    } catch {
      setState({ error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." });
    } finally {
      setPending(false);
    }
  }

  if (state.success && state.link) {
    return (
      <SendSuccess
        link={state.link}
        emailed={state.emailed ?? 0}
        email={state.signerEmail ?? clientEmail}
        contractNumber={state.contractNumber}
        contractTitle={title}
        error={state.error}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* ------------------------------ CLIENTE ------------------------------ */}
      <section className="rounded-xl border border-paper-line bg-white p-5">
        <h2 className="text-base font-bold">Quem vai receber o documento</h2>
        <p className="mt-1 text-sm text-ink-mute">
          O cliente recebe o link por e-mail. Não precisa ter conta aqui.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="clientName" className="mb-1.5 block text-sm font-semibold">
              Nome do cliente <span className="text-bad">*</span>
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (!signerName) setSignerName(e.target.value);
              }}
              placeholder="Maria Souza"
              autoComplete="off"
              className="field"
            />
            {fieldError("clientName") && (
              <p className="mt-1 text-xs text-bad">{fieldError("clientName")}</p>
            )}
          </div>

          <div>
            <label htmlFor="clientEmail" className="mb-1.5 block text-sm font-semibold">
              E-mail do cliente <span className="text-bad">*</span>
            </label>
            <input
              id="clientEmail"
              name="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => {
                setClientEmail(e.target.value);
                if (!signerEmail) setSignerEmail(e.target.value);
              }}
              placeholder="maria@empresa.com"
              autoComplete="off"
              className="field"
            />
            {fieldError("clientEmail") && (
              <p className="mt-1 text-xs text-bad">{fieldError("clientEmail")}</p>
            )}
          </div>

          <div>
            <label htmlFor="clientDocument" className="mb-1.5 block text-sm font-semibold">
              CPF / CNPJ
            </label>
            <input
              id="clientDocument"
              name="clientDocument"
              type="text"
              value={clientDocument}
              onChange={(e) => setClientDocument(e.target.value)}
              placeholder="000.000.000-00"
              autoComplete="off"
              className="field"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="clientAddress" className="mb-1.5 block text-sm font-semibold">
              Endereço
            </label>
            <input
              id="clientAddress"
              name="clientAddress"
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Rua, número, cidade"
              autoComplete="off"
              className="field"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------ CONTRATO ------------------------------ */}
      <section className="rounded-xl border border-paper-line bg-white p-5">
        <h2 className="text-base font-bold">O que você está contratando</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Os dados do cliente e da empresa são preenchidos no documento automaticamente.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="templateId" className="mb-1.5 block text-sm font-semibold">
              Modelo de contrato
            </label>
            <select
              id="templateId"
              name="templateId"
              value={templateId}
              onChange={(e) => pickTemplate(e.target.value)}
              className="field"
            >
              <option value="">Documento padrão (sem modelo)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.category ? ` — ${t.category}` : ""}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-1.5 text-xs text-ink-mute">
                <Sparkles className="mr-1 inline h-3 w-3" aria-hidden />
                {selectedTemplate.variables.length} campo
                {selectedTemplate.variables.length === 1 ? "" : "s"} serão preenchidos
                automaticamente:{" "}
                {selectedTemplate.variables.map((v) => v.label).join(", ")}.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
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
              className="field"
            />
            {fieldError("title") && <p className="mt-1 text-xs text-bad">{fieldError("title")}</p>}
          </div>

          <div>
            <label htmlFor="value" className="mb-1.5 block text-sm font-semibold">
              Valor
            </label>
            <input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="expiresInDays" className="mb-1.5 block text-sm font-semibold">
              Prazo do link (dias)
            </label>
            <input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min="1"
              max="365"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="startDate" className="mb-1.5 block text-sm font-semibold">
              Início
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="mb-1.5 block text-sm font-semibold">
              Término
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------ COFRE ------------------------------ */}
      <section className="rounded-xl border border-paper-line bg-white p-5">
        <h2 className="text-base font-bold">Onde guardar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="vaultId" className="mb-1.5 block text-sm font-semibold">
              Cofre
            </label>
            <select
              id="vaultId"
              name="vaultId"
              value={showNewVault ? "__novo__" : vaultId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__novo__") {
                  setShowNewVault(true);
                } else {
                  setShowNewVault(false);
                  setVaultId(v);
                }
              }}
              className="field"
            >
              <option value="">Nenhum (não guardar)</option>
              {vaults.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.isDefault ? " (padrão)" : ""}
                </option>
              ))}
              <option value="__novo__">＋ Criar novo cofre</option>
            </select>
          </div>

          {showNewVault && (
            <div>
              <label htmlFor="newVaultName" className="mb-1.5 block text-sm font-semibold">
                Nome do novo cofre
              </label>
              <input
                id="newVaultName"
                name="newVaultName"
                type="text"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                placeholder="Cofre principal"
                className="field"
              />
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------ ENVIAR ------------------------------ */}
      <section className="rounded-xl border border-paper-line bg-white p-5">
        <h2 className="text-base font-bold">Enviar para assinatura</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Quem receber o link assina direto no navegador, sem instalar nada.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="signerName" className="mb-1.5 block text-sm font-semibold">
              Nome de quem assina <span className="text-bad">*</span>
            </label>
            <input
              id="signerName"
              name="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Souza"
              autoComplete="off"
              className="field"
            />
            {fieldError("signerName") && (
              <p className="mt-1 text-xs text-bad">{fieldError("signerName")}</p>
            )}
          </div>

          <div>
            <label htmlFor="signerEmail" className="mb-1.5 block text-sm font-semibold">
              E-mail de quem assina <span className="text-bad">*</span>
            </label>
            <input
              id="signerEmail"
              name="signerEmail"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="maria@empresa.com"
              autoComplete="off"
              className="field"
            />
            {fieldError("signerEmail") && (
              <p className="mt-1 text-xs text-bad">{fieldError("signerEmail")}</p>
            )}
          </div>
        </div>
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn h-12 w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Criando e enviando...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" aria-hidden />
              Criar e enviar por e-mail
            </>
          )}
        </button>
        <Link
          href="/contratos"
          className="inline-flex h-12 items-center gap-2 rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          <FolderPlus className="h-4 w-4" aria-hidden /> Voltar
        </Link>
      </div>
    </form>
  );
}
