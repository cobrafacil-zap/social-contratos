"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { optionalText, readTemplateForm } from "@/lib/templates";

export type TemplateState = {
  error?: string;
  success?: string;
};

/** Cria um novo modelo de contrato para a empresa da sessão. */
export async function createTemplateAction(
  _: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const { userId, companyId } = await requireUser();

  if (!rateLimit(`template:create:${userId}`, 30, 60_000)) {
    return { error: "Você criou muitos modelos em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const parsed = readTemplateForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
  }

  const { name, category, contentHtml, headerHtml, footerHtml } = parsed.data;

  const template = await db.contractTemplate.create({
    data: {
      companyId,
      name,
      category: optionalText(category),
      content: { html: contentHtml },
      headerHtml: optionalText(headerHtml),
      footerHtml: optionalText(footerHtml),
      createdBy: userId,
    },
  });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "TEMPLATE_CREATED",
      entity: "ContractTemplate",
      entityId: template.id,
      metadata: { name },
    },
  });

  redirect(`/modelos/${template.id}`);
}
