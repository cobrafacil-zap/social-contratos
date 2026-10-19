"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

/** Marca como lidas todas as notificações não lidas do usuário na empresa. */
export async function markAllRead(_formData: FormData): Promise<void> {
  const session = await requireUser();
  const { companyId, userId } = session;

  await db.notification.updateMany({
    where: { companyId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificacoes");
}

/**
 * Marca uma notificação específica como lida.
 * Aceita o id direto (`markRead(id)`) ou via FormData (uso em <form action={markRead}>),
 * o que mantém o botão funcionando também sem JavaScript.
 */
export async function markRead(idOrFormData: string | FormData, _formData?: FormData): Promise<void> {
  const session = await requireUser();
  const { companyId, userId } = session;

  const id = typeof idOrFormData === "string" ? idOrFormData : String(idOrFormData.get("id") ?? "");
  if (!id) return;

  await db.notification.updateMany({
    where: {
      id,
      companyId,
      // Notificações da empresa (userId nulo) ou do próprio usuário.
      OR: [{ userId }, { userId: null }],
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificacoes");
}
