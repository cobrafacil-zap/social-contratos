"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { mergeTemplateContent, optionalText, readTemplateForm } from "@/lib/templates";
import type { TemplateState } from "../actions";

/** Atualiza um modelo de contrato da empresa preservando as demais chaves de `content`. */
export async function updateTemplateAction(
  id: string,
  _: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const { userId, companyId } = await requireUser();

  if (!rateLimit(`template:update:${userId}`, 30, 60_000)) {
    return { error: "Você atualizou muitos modelos em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const parsed = readTemplateForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
  }

  const existing = await db.contractTemplate.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true, content: true },
  });
  if (!existing) {
    return { error: "Modelo não encontrado ou removido." };
  }

  const { name, category, contentHtml, headerHtml, footerHtml } = parsed.data;

  await db.contractTemplate.update({
    where: { id, companyId },
    data: {
      name,
      category: optionalText(category),
      content: mergeTemplateContent(existing.content, contentHtml),
      headerHtml: optionalText(headerHtml),
      footerHtml: optionalText(footerHtml),
    },
  });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "TEMPLATE_UPDATED",
      entity: "ContractTemplate",
      entityId: existing.id,
      metadata: { name },
    },
  });

  redirect(`/modelos/${id}`);
}

/** Exclui (soft delete) um modelo de contrato da empresa. */
export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const { userId, companyId } = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/modelos");

  const existing = await db.contractTemplate.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!existing) redirect("/modelos");

  await db.contractTemplate.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "TEMPLATE_DELETED",
      entity: "ContractTemplate",
      entityId: existing.id,
      metadata: { name: existing.name },
    },
  });

  redirect("/modelos");
}
