"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { hashPassword, verifyPassword } from "@/server/password";
import { rateLimit } from "@/server/security/rate-limit";

export type ContaState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido.")
    .max(254, "E-mail muito longo."),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual.").max(200),
  newPassword: z
    .string()
    .min(12, "A nova senha deve ter pelo menos 12 caracteres.")
    .max(200, "A nova senha deve ter no máximo 200 caracteres."),
  confirmPassword: z.string().min(1, "Confirme a nova senha."),
});

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateProfileAction(
  _prev: ContaState,
  formData: FormData,
): Promise<ContaState> {
  const session = await requireUser();

  const parsed = profileSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Revise os campos destacados e tente novamente.", fieldErrors };
  }

  const { name, email } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== session.userId) {
    return { error: "Este e-mail já está em uso por outro usuário." };
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { name, email },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: session.userId,
        metadata: { name, email },
      },
    });

    revalidatePath("/conta");
    return { success: "Dados atualizados com sucesso." };
  } catch (e) {
    console.error("[PROFILE UPDATE ERROR]", e);
    return { error: "Não foi possível atualizar seus dados. Tente novamente." };
  }
}

export async function changePasswordAction(
  _prev: ContaState,
  formData: FormData,
): Promise<ContaState> {
  const session = await requireUser();

  if (!rateLimit(`password:change:${session.userId}`, 5, 15 * 60_000)) {
    return { error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." };
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não confere com a nova senha." };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Usuário não encontrado." };

  const valid = await verifyPassword(currentPassword, user.passwordHash).catch(() => false);
  if (!valid) return { error: "Senha atual incorreta." };

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "PASSWORD_CHANGED",
        entity: "User",
        entityId: session.userId,
      },
    });

    revalidatePath("/conta");
    return { success: "Senha alterada com sucesso." };
  } catch (e) {
    console.error("[PASSWORD CHANGE ERROR]", e);
    return { error: "Não foi possível alterar a senha. Tente novamente." };
  }
}
