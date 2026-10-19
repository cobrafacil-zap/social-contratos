"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export type EmpresaState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome da empresa deve ter pelo menos 2 caracteres.")
    .max(120, "O nome da empresa deve ter no máximo 120 caracteres."),
  legalName: z.string().trim().max(160, "A razão social deve ter no máximo 160 caracteres."),
  cnpj: z.string().trim().regex(/^\d{0,14}$/, "O CNPJ deve conter apenas números (14 dígitos)."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Informe um e-mail válido."),
  phone: z.string().trim().max(40, "O telefone deve ter no máximo 40 caracteres."),
  address: z.string().trim().max(240, "O endereço deve ter no máximo 240 caracteres."),
  website: z.string().trim().max(200, "O site deve ter no máximo 200 caracteres."),
  primaryColor: z.string().trim().regex(HEX_COLOR, "Informe uma cor no formato #RRGGBB."),
  secondaryColor: z.string().trim().regex(HEX_COLOR, "Informe uma cor no formato #RRGGBB."),
  contractPrefix: z
    .string()
    .trim()
    .min(2, "O prefixo deve ter pelo menos 2 caracteres.")
    .max(10, "O prefixo deve ter no máximo 10 caracteres.")
    .regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números.")
    .transform((v) => v.toUpperCase()),
  responsibleName: z.string().trim().max(120, "O responsável deve ter no máximo 120 caracteres."),
});

/** Lê um campo do FormData como string já sem espaços nas pontas. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCompanyAction(
  _prev: EmpresaState,
  formData: FormData,
): Promise<EmpresaState> {
  const session = await requireUser();

  const parsed = companySchema.safeParse({
    name: text(formData, "name"),
    legalName: text(formData, "legalName"),
    cnpj: text(formData, "cnpj"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
    website: text(formData, "website"),
    primaryColor: text(formData, "primaryColor"),
    secondaryColor: text(formData, "secondaryColor"),
    contractPrefix: text(formData, "contractPrefix"),
    responsibleName: text(formData, "responsibleName"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Revise os campos destacados e tente novamente.", fieldErrors };
  }

  const data = parsed.data;

  try {
    await db.company.update({
      where: { id: session.companyId },
      data: {
        name: data.name,
        legalName: data.legalName || null,
        cnpj: data.cnpj || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        website: data.website || null,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        contractPrefix: data.contractPrefix,
        responsibleName: data.responsibleName || null,
      },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "COMPANY_UPDATED",
        entity: "Company",
        entityId: session.companyId,
        metadata: { name: data.name, contractPrefix: data.contractPrefix },
      },
    });

    revalidatePath("/empresa");
    revalidatePath("/configuracoes");
    return { success: "Dados da empresa salvos com sucesso." };
  } catch (e) {
    console.error("[COMPANY UPDATE ERROR]", e);
    return { error: "Não foi possível salvar os dados da empresa. Tente novamente." };
  }
}
