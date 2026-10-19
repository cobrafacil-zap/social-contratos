import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Tipos compartilhados entre servidor e cliente                             */
/* -------------------------------------------------------------------------- */

export type SignerInput = {
  name: string;
  email: string;
  role: string;
};

export type ClientOption = {
  id: string;
  name: string;
  document: string | null;
  email: string;
  companyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type TemplateOption = {
  id: string;
  name: string;
  category: string | null;
  /** Variáveis detectadas no modelo, já com rótulo amigável. */
  variables: { key: string; label: string }[];
};

export type VaultOption = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
};

export type CompanyOption = {
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  responsibleName: string | null;
};

/** Conteúdo salvo em `ContractVersion.content`. */
export type VersionContent = {
  html: string;
  /** Signatários previstos para esta versão (criados de fato no envio). */
  signers?: SignerInput[];
};

export type ContractFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Passo do wizard que contém o primeiro erro (1..3). */
  invalidStep?: 1 | 2 | 3;
};

export type SendContractState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Links de assinatura gerados (token em claro, exibido uma única vez). */
  links?: { name: string; email: string; url: string }[];
};

/* -------------------------------------------------------------------------- */
/* Validação (zod)                                                            */
/* -------------------------------------------------------------------------- */

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ invalid_type_error: "Informe um valor numérico" })
    .min(0, "O valor não pode ser negativo")
    .max(999_999_999.99, "Valor acima do limite")
    .optional()
);

const optionalDays = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ invalid_type_error: "Informe um número de dias" })
    .int("Informe um número inteiro")
    .min(0, "O prazo não pode ser negativo")
    .max(3650, "O prazo não pode passar de 3650 dias")
    .optional()
);

const optionalDate = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
    "Data inválida"
  )
  .optional();

export const signerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do signatário").max(120, "Nome muito longo"),
  email: z.string().trim().email("Informe um e-mail válido").max(254, "E-mail muito longo"),
  role: z.string().trim().min(1, "Informe o papel do signatário").max(60, "Papel muito longo"),
});

export const signersSchema = z
  .array(signerSchema)
  .min(1, "Adicione ao menos um signatário")
  .max(20, "No máximo 20 signatários");

/** Passo 1 — dados do contrato. */
export const step1Schema = z.object({
  clientId: z.string().trim().min(1, "Selecione o cliente"),
  title: z.string().trim().min(3, "O título deve ter pelo menos 3 caracteres").max(160, "Título muito longo"),
  templateId: z.string().trim().optional(),
  value: optionalNumber,
  startDate: optionalDate,
  endDate: optionalDate,
  expiresInDays: optionalDays,
});

/** Passo 2 — cofre de documentos. */
const step2Shape = {
  vaultId: z.string().trim().optional(),
  newVaultName: z.string().trim().max(120, "Nome do cofre muito longo").optional(),
  newVaultDescription: z.string().trim().max(200, "Descrição muito longa").optional(),
};

export const step2Schema = z.object(step2Shape).refine(
  (d) => d.vaultId !== "__novo__" || (!!d.newVaultName && d.newVaultName.length >= 2),
  { message: "Informe o nome do cofre", path: ["newVaultName"] }
);

/** Passo 3 — variáveis e signatários. */
export const step3Schema = z.object({
  variables: z.record(z.string().max(2000, "Texto muito longo")),
  signers: signersSchema,
});

/** Payload completo validado no servidor (criação). */
export const contractPayloadSchema = step1Schema
  .merge(z.object(step2Shape))
  .extend({
    variables: z.record(z.string().max(2000, "Texto muito longo")),
    signers: signersSchema,
  });

/** Payload completo validado no servidor (edição). */
export const contractUpdateSchema = z.object({
  title: z.string().trim().min(3, "O título deve ter pelo menos 3 caracteres").max(160, "Título muito longo"),
  value: optionalNumber,
  startDate: optionalDate,
  endDate: optionalDate,
  variables: z.record(z.string().max(2000, "Texto muito longo")),
});

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

/** Converte os issues do zod em `{ campo: mensagem }`. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Mapa campo -> passo do wizard (usado para voltar ao passo com erro). */
export function stepForField(field: string): 1 | 2 | 3 {
  if (["clientId", "title", "templateId", "value", "startDate", "endDate", "expiresInDays"].includes(field)) return 1;
  if (["vaultId", "newVaultName", "newVaultDescription"].includes(field)) return 2;
  return 3;
}

/** Lê os signatários previstos guardados no conteúdo de uma versão. */
export function getVersionSigners(content: unknown): SignerInput[] {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const signers = (content as { signers?: unknown }).signers;
    if (Array.isArray(signers)) {
      const parsed = signersSchema.safeParse(signers);
      if (parsed.success) return parsed.data;
    }
  }
  return [];
}

/** Converte "2025-03-10" em "10/03/2025" (sem passar por Date/UTC). */
export function formatDateInput(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}
