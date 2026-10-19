"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";

/** Estado devolvido pelas actions de cliente (renderizado pelo formulário). */
export type ClientFormState = {
  error?: string;
  values?: ClientFormValues;
};

/** Valores do formulário de cliente. */
export type ClientFormValues = {
  name: string;
  responsibleName: string;
  email: string;
  document: string;
  phone: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

/** Dados já validados e normalizados para gravação no banco. */
export type ClientInput = {
  name: string;
  responsibleName: string;
  email: string;
  document: string | null;
  phone: string | null;
  legalName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type ClientParseResult =
  | { ok: true; data: ClientInput }
  | { ok: false; error: string; values: ClientFormValues };

/** Remove a máscara de formatação (pontos, traços, barras, espaços e parênteses). */
const removeMask = (value: string) => value.replace(/[.\-/\s()]/g, "");

const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente com pelo menos 2 caracteres.")
    .max(150, "O nome do cliente deve ter no máximo 150 caracteres."),
  responsibleName: z
    .string()
    .trim()
    .min(2, "Informe o nome do responsável com pelo menos 2 caracteres.")
    .max(150, "O nome do responsável deve ter no máximo 150 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido.")
    .max(254, "O e-mail deve ter no máximo 254 caracteres."),
  document: z
    .string()
    .trim()
    .transform(removeMask)
    .refine((v) => /^\d*$/.test(v), "O documento deve conter apenas números (CPF ou CNPJ).")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().max(20, "O documento deve ter no máximo 20 dígitos.").nullable())
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "O telefone deve ter no máximo 30 caracteres.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().nullable())
    .optional(),
  legalName: z
    .string()
    .trim()
    .max(150, "A razão social deve ter no máximo 150 caracteres.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().nullable())
    .optional(),
  address: z
    .string()
    .trim()
    .max(200, "O endereço deve ter no máximo 200 caracteres.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().nullable())
    .optional(),
  city: z
    .string()
    .trim()
    .max(100, "A cidade deve ter no máximo 100 caracteres.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().nullable())
    .optional(),
  state: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v) || v === "", "A UF deve ter exatamente 2 letras.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().nullable())
    .optional(),
  zip: z
    .string()
    .trim()
    .transform(removeMask)
    .refine((v) => /^\d*$/.test(v), "O CEP deve conter apenas números.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().max(10, "O CEP deve ter no máximo 10 dígitos.").nullable())
    .optional(),
});

/** Lê os campos do formulário (sempre como string). */
function readValues(formData: FormData): ClientFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    responsibleName: String(formData.get("responsibleName") ?? ""),
    email: String(formData.get("email") ?? ""),
    document: String(formData.get("document") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    zip: String(formData.get("zip") ?? ""),
  };
}

/**
 * Valida e normaliza os dados do formulário de cliente.
 * Exportado como ação para ser reaproveitado pelo formulário de edição.
 */
export async function parseClientForm(formData: FormData): Promise<ClientParseResult> {
  const values = readValues(formData);
  const parsed = clientSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revise os campos e tente novamente.",
      values,
    };
  }

  const data = parsed.data;
  return {
    ok: true,
    data: {
      name: data.name,
      responsibleName: data.responsibleName,
      email: data.email,
      document: data.document ?? null,
      phone: data.phone ?? null,
      legalName: data.legalName ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip: data.zip ?? null,
    },
  };
}

/**
 * Cria um cliente na empresa da sessão.
 * O modelo Client não possui coluna própria para o nome do responsável:
 * por isso a razão social tem precedência e, na ausência dela, guardamos
 * o nome do responsável para não perder a informação do contato.
 */
export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const session = await requireUser();

  if (!rateLimit(`client:create:${session.userId}`, 30, 60_000)) {
    return { error: "Muitas tentativas de cadastro. Aguarde um minuto antes de tentar novamente." };
  }

  const parsed = await parseClientForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };

  const data = parsed.data;

  let created;
  try {
    created = await db.client.create({
      data: {
        companyId: session.companyId,
        createdBy: session.userId,
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        companyName: data.legalName ?? data.responsibleName,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "CLIENT_CREATED",
        entity: "Client",
        entityId: created.id,
        metadata: { name: created.name },
      },
    });
  } catch (error) {
    console.error("[CLIENT CREATE ERROR]", error);
    return { error: "Não foi possível salvar o cliente. Tente novamente em instantes." };
  }

  redirect(`/clientes/${created.id}`);
}
