"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FolderPlus,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Alert, Field, Select, SubmitButton, Textarea } from "@/components/ui";
import {
  deleteVault,
  saveVault,
  setDefaultVault,
  type VaultActionState,
} from "./actions";
import {
  addContractToVault,
  downloadDocument,
  removeContractFromVault,
  removeDocument,
  uploadDocument,
  type VaultDetailState,
} from "./[vaultId]/actions";
import { DOCUMENT_KIND } from "@/lib/status";

export type VaultSummary = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

/* -------------------------------------------------------------------------- */
/* Modal (renderizado via portal para escapar do container do layout)          */
/* -------------------------------------------------------------------------- */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-14"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-paper-line bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-paper"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Botões utilitários                                                          */
/* -------------------------------------------------------------------------- */

const softButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-paper-line bg-white px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60";

const dangerButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-bad/30 bg-bad-tint px-3 text-sm font-semibold text-bad transition-colors hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-60";

/* -------------------------------------------------------------------------- */
/* Formulário de cofre (criar / editar)                                        */
/* -------------------------------------------------------------------------- */

function VaultForm({
  vault,
  onDone,
}: {
  vault?: VaultSummary;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<VaultActionState, FormData>(
    saveVault,
    {},
  );
  const [color, setColor] = useState(vault?.color ?? "#2F4BFF");
  const doneRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [state.success, onDone]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {vault ? <input type="hidden" name="id" value={vault.id} /> : null}
      <Field
        label="Nome do cofre"
        name="name"
        required
        defaultValue={vault?.name}
        placeholder="Ex.: Contratos 2026"
        hint="Como o cofre aparecerá na listagem."
      />
      <Textarea
        label="Descrição"
        name="description"
        rows={3}
        defaultValue={vault?.description ?? ""}
        placeholder="Opcional: para que serve este cofre?"
      />
      <div>
        <label htmlFor="color" className="mb-1.5 block text-sm font-semibold">
          Cor do cofre
        </label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-11 w-16 cursor-pointer rounded-lg border border-paper-line bg-white p-1"
          />
          <span className="font-mono text-sm text-ink-mute">{color}</span>
        </div>
        <p className="mt-1 text-xs text-ink-mute">
          A cor é usada para identificar o cofre rapidamente nas listas.
        </p>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
        >
          Cancelar
        </button>
        <SubmitButton pending={pending} pendingText="Salvando…">
          {vault ? "Salvar alterações" : "Criar cofre"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** Botão "Novo cofre" que abre o formulário de criação. */
export function NewVaultButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn">
        <Plus className="h-4 w-4" aria-hidden />
        Novo cofre
      </button>
      {open ? (
        <Modal title="Novo cofre" onClose={() => setOpen(false)}>
          <VaultForm onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
    </>
  );
}

/** Botão "Renomear/editar" de um cofre. */
export function EditVaultButton({ vault }: { vault: VaultSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={softButton}>
        <Pencil className="h-4 w-4" aria-hidden />
        Renomear
      </button>
      {open ? (
        <Modal title={`Editar “${vault.name}”`} onClose={() => setOpen(false)}>
          <VaultForm vault={vault} onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
    </>
  );
}

/** Define o cofre como padrão da empresa. */
export function SetDefaultVaultButton({
  vaultId,
  isDefault,
  compact = false,
}: {
  vaultId: string;
  isDefault: boolean;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<VaultActionState, FormData>(
    setDefaultVault,
    {},
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="vaultId" value={vaultId} />
      <button
        type="submit"
        disabled={pending || isDefault}
        title={isDefault ? "Este já é o cofre padrão" : "Definir como padrão"}
        className={isDefault ? softButton : compact ? softButton : "btn"}
      >
        <Star className="h-4 w-4" aria-hidden />
        {isDefault ? "Padrão" : "Definir como padrão"}
      </button>
      {state.error ? (
        <p className="mt-1 text-xs text-bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/** Exclui um cofre (com confirmação explícita). */
export function DeleteVaultButton({
  vaultId,
  name,
}: {
  vaultId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState<VaultActionState, FormData>(
    deleteVault,
    {},
  );
  const doneRef = useRef(false);

  useEffect(() => {
    if (state.success && !doneRef.current) {
      doneRef.current = true;
      setOpen(false);
    }
  }, [state.success]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={dangerButton}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Excluir
      </button>
      {open ? (
        <Modal title={`Excluir “${name}”`} onClose={() => setOpen(false)}>
          <form action={action} className="space-y-4" noValidate>
            <input type="hidden" name="vaultId" value={vaultId} />
            <p className="text-sm text-ink-soft">
              A exclusão só é permitida quando o cofre não possui contratos nem
              documentos guardados. Esta ação não pode ser desfeita.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                name="confirm"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-paper-line text-cobalt focus:ring-cobalt/30"
              />
              <span className="text-sm font-medium">
                Confirmo a exclusão do cofre “{name}”.
              </span>
            </label>

            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            {state.success ? <Alert tone="success">{state.success}</Alert> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-paper-line bg-white px-5 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-paper"
              >
                Cancelar
              </button>
              <SubmitButton
                pending={pending}
                pendingText="Excluindo…"
                variant="danger"
              >
                Excluir cofre
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Detalhe do cofre: contratos e documentos                                     */
/* -------------------------------------------------------------------------- */

/** Adiciona (ou move) um contrato para o cofre. */
export function AddContractForm({
  vaultId,
  options,
}: {
  vaultId: string;
  options: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<VaultDetailState, FormData>(
    addContractToVault,
    {},
  );

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="vaultId" value={vaultId} />
      <Select
        label="Contrato"
        name="contractId"
        required
        placeholder="Selecione um contrato"
        options={options}
        hint="Contratos sem cofre podem ser guardados; contratos de outros cofres são movidos para este."
      />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <SubmitButton pending={pending} pendingText="Guardando…">
        <FolderPlus className="h-4 w-4" aria-hidden />
        Adicionar contrato
      </SubmitButton>
    </form>
  );
}

/** Remove um contrato do cofre. */
export function RemoveContractButton({
  vaultId,
  contractId,
  number,
}: {
  vaultId: string;
  contractId: string;
  number: string;
}) {
  const [state, action, pending] = useActionState<VaultDetailState, FormData>(
    removeContractFromVault,
    {},
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="vaultId" value={vaultId} />
      <input type="hidden" name="contractId" value={contractId} />
      <button
        type="submit"
        disabled={pending}
        title={`Remover o contrato ${number} do cofre`}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ink-mute transition-colors hover:bg-paper hover:text-bad disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Remover
      </button>
      {state.error ? (
        <p className="mt-1 text-xs text-bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/** Envia um documento para o cofre. */
export function UploadDocumentForm({
  vaultId,
  maxSizeMb,
}: {
  vaultId: string;
  maxSizeMb: number;
}) {
  const [state, action, pending] = useActionState<VaultDetailState, FormData>(
    uploadDocument,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (state.success && !doneRef.current) {
      doneRef.current = true;
      formRef.current?.reset();
    }
  }, [state.success]);

  const kindOptions = Object.entries(DOCUMENT_KIND).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <form
      ref={formRef}
      action={action}
      encType="multipart/form-data"
      className="space-y-3"
      noValidate
    >
      <input type="hidden" name="vaultId" value={vaultId} />
      <Select
        label="Tipo de documento"
        name="kind"
        required
        defaultValue="ATTACHMENT"
        options={kindOptions}
      />
      <div>
        <label htmlFor="file" className="mb-1.5 block text-sm font-semibold">
          Arquivo
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="field h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink-soft"
        />
        <p className="mt-1 text-xs text-ink-mute">
          Tamanho máximo de {maxSizeMb} MB. O arquivo é enviado para o
          Supabase Storage.
        </p>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <SubmitButton pending={pending} pendingText="Enviando…">
        <Upload className="h-4 w-4" aria-hidden />
        Enviar documento
      </SubmitButton>
    </form>
  );
}

/** Baixa um documento do cofre (URL assinada temporária). */
export function DownloadDocumentButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [state, action, pending] = useActionState<VaultDetailState, FormData>(
    downloadDocument,
    {},
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        disabled={pending}
        title={`Baixar ${fileName}`}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cobalt transition-colors hover:bg-cobalt-tint disabled:opacity-60"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {pending ? "Abrindo…" : "Baixar"}
      </button>
      {state.error ? (
        <p className="mt-1 text-xs text-bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/** Remove um documento do cofre (exclusão lógica). */
export function RemoveDocumentButton({
  vaultId,
  documentId,
}: {
  vaultId: string;
  documentId: string;
}) {
  const [state, action, pending] = useActionState<VaultDetailState, FormData>(
    removeDocument,
    {},
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="vaultId" value={vaultId} />
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        disabled={pending}
        title="Remover o documento do cofre"
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ink-mute transition-colors hover:bg-paper hover:text-bad disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remover
      </button>
      {state.error ? (
        <p className="mt-1 text-xs text-bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
