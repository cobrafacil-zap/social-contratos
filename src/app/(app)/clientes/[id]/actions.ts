"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { parseClientForm, type ClientFormState } from "../actions";

/**
 * Atualiza um cliente. O registro precisa pertencer à empresa da sessão e
 * `companyId`/`createdBy` nunca podem ser alterados por esta action.
 */
export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const session = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Cliente inválido." };
  }

  if (!rateLimit(`client:update:${session.userId}`, 60, 60_000)) {
    return { error: "Muitas tentativas de alteração. Aguarde um minuto antes de tentar novamente." };
  }

  const existing = await db.client.findFirst({
    where: { id, companyId: session.companyId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { error: "Cliente não encontrado." };
  }

  const parsed = await parseClientForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };

  const data = parsed.data;

  try {
    await db.client.update({
      where: { id: existing.id },
      data: {
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
        action: "CLIENT_UPDATED",
        entity: "Client",
        entityId: existing.id,
        metadata: { name: data.name },
      },
    });
  } catch (error) {
    console.error("[CLIENT UPDATE ERROR]", error);
    return { error: "Não foi possível salvar as alterações. Tente novamente em instantes." };
  }

  redirect(`/clientes/${existing.id}`);
}

/**
 * Exclusão lógica (soft delete): o registro recebe `deletedAt` e sai da
 * listagem, mas continua no banco preservando o histórico dos contratos.
 */
export async function deleteClientAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const confirmed = String(formData.get("confirm") ?? "");

  if (!id || confirmed !== "1") {
    return;
  }

  if (!rateLimit(`client:delete:${session.userId}`, 20, 60_000)) {
    return;
  }

  const existing = await db.client.findFirst({
    where: { id, companyId: session.companyId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!existing) {
    redirect("/clientes");
    return;
  }

  try {
    await db.client.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "CLIENT_DELETED",
        entity: "Client",
        entityId: existing.id,
        metadata: { name: existing.name },
      },
    });
  } catch (error) {
    console.error("[CLIENT DELETE ERROR]", error);
    return;
  }

  redirect("/clientes");
}
