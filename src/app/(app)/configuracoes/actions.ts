"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export type SettingsState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const settingsSchema = z.object({
  defaultValidityDays: z.coerce
    .number({ invalid_type_error: "Informe um número de dias." })
    .int("Informe um número inteiro de dias.")
    .min(1, "O prazo deve ter pelo menos 1 dia.")
    .max(365, "O prazo deve ter no máximo 365 dias."),
  notifyClientByEmail: z.boolean(),
  requireTermsAcceptance: z.boolean(),
  accentColor: z.string().trim().regex(HEX_COLOR, "Informe uma cor no formato #RRGGBB."),
});

/** Lê um campo do FormData como string já sem espaços nas pontas. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Converte o campo Json da empresa em um objeto simples, nunca null. */
function readSettings(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function saveSettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await requireUser();

  const parsed = settingsSchema.safeParse({
    defaultValidityDays: text(formData, "defaultValidityDays"),
    notifyClientByEmail: formData.get("notifyClientByEmail") === "on",
    requireTermsAcceptance: formData.get("requireTermsAcceptance") === "on",
    accentColor: text(formData, "accentColor"),
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
    const company = await db.company.findUnique({
      where: { id: session.companyId },
      select: { settings: true },
    });

    // Merge: preserva as chaves já existentes que não fazem parte deste formulário.
    const merged = {
      ...readSettings(company?.settings ?? null),
      defaultValidityDays: data.defaultValidityDays,
      notifyClientByEmail: data.notifyClientByEmail,
      requireTermsAcceptance: data.requireTermsAcceptance,
      accentColor: data.accentColor,
    };

    await db.company.update({
      where: { id: session.companyId },
      data: { settings: merged as unknown as Prisma.InputJsonValue },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "SETTINGS_UPDATED",
        entity: "Company",
        entityId: session.companyId,
        metadata: { defaultValidityDays: data.defaultValidityDays },
      },
    });

    revalidatePath("/configuracoes");
    return { success: "Preferências salvas com sucesso." };
  } catch (e) {
    console.error("[SETTINGS UPDATE ERROR]", e);
    return { error: "Não foi possível salvar as preferências. Tente novamente." };
  }
}
