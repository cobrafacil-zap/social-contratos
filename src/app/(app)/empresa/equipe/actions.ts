"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { hashPassword } from "@/server/password";

export type EquipeState = {
  success?: string;
  error?: string;
  createdEmail?: string;
  createdPassword?: string;
};

const ROLE_KEYS = ["ADMIN", "EMPLOYEE", "SALES", "FINANCE", "VIEWER"] as const;

const roleSchema = z.enum(ROLE_KEYS, {
  errorMap: () => ({ message: "Selecione um papel válido." }),
});

const newUserSchema = z.object({
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
  password: z
    .string()
    .min(12, "A senha deve ter pelo menos 12 caracteres.")
    .max(200, "A senha deve ter no máximo 200 caracteres."),
  role: roleSchema,
});

/** Recarrega o usuário da sessão no banco e garante que ele é administrador ativo. */
async function requireAdmin() {
  const session = await requireUser();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, companyId: true, role: true, isActive: true, deletedAt: true },
  });
  if (!user || user.deletedAt || !user.isActive) return null;
  if (user.role !== "ADMIN") return null;
  return { session, user };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateTeam() {
  revalidatePath("/empresa/equipe");
  revalidatePath("/empresa");
  revalidatePath("/configuracoes");
}

export async function changeUserRoleAction(
  userId: string,
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Apenas administradores podem alterar o papel dos usuários." };

  const parsed = roleSchema.safeParse(text(formData, "role"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Papel inválido." };
  const role = parsed.data;

  const target = await db.user.findFirst({
    where: { id: userId, companyId: admin.session.companyId, deletedAt: null },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target) return { error: "Usuário não encontrado nesta empresa." };

  if (target.role === role) {
    return { success: "O papel do usuário já está atualizado." };
  }

  // Não é possível remover o último administrador ativo da empresa.
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const others = await db.user.count({
      where: {
        companyId: admin.session.companyId,
        role: "ADMIN",
        isActive: true,
        deletedAt: null,
        id: { not: target.id },
      },
    });
    if (others === 0) {
      return {
        error: "Não é possível remover o último administrador ativo da empresa. Promova outro usuário antes.",
      };
    }
  }

  await db.user.update({ where: { id: target.id }, data: { role } });

  await db.activityLog.create({
    data: {
      companyId: admin.session.companyId,
      userId: admin.user.id,
      action: "USER_ROLE_CHANGED",
      entity: "User",
      entityId: target.id,
      metadata: { from: target.role, to: role, name: target.name },
    },
  });

  revalidateTeam();
  return { success: `Papel de ${target.name} atualizado com sucesso.` };
}

export async function toggleUserStatusAction(
  userId: string,
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Apenas administradores podem ativar ou desativar usuários." };

  const target = await db.user.findFirst({
    where: { id: userId, companyId: admin.session.companyId, deletedAt: null },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target) return { error: "Usuário não encontrado nesta empresa." };

  if (target.id === admin.user.id) {
    return { error: "Você não pode desativar a sua própria conta." };
  }

  const nextStatus = !target.isActive;

  // Não é possível desativar o último administrador ativo da empresa.
  if (!nextStatus && target.role === "ADMIN") {
    const others = await db.user.count({
      where: {
        companyId: admin.session.companyId,
        role: "ADMIN",
        isActive: true,
        deletedAt: null,
        id: { not: target.id },
      },
    });
    if (others === 0) {
      return {
        error: "Não é possível desativar o último administrador ativo da empresa. Promova outro usuário antes.",
      };
    }
  }

  await db.user.update({ where: { id: target.id }, data: { isActive: nextStatus } });

  await db.activityLog.create({
    data: {
      companyId: admin.session.companyId,
      userId: admin.user.id,
      action: "USER_STATUS_CHANGED",
      entity: "User",
      entityId: target.id,
      metadata: { isActive: nextStatus, name: target.name },
    },
  });

  revalidateTeam();
  return {
    success: nextStatus
      ? `${target.name} foi ativado com sucesso.`
      : `${target.name} foi desativado com sucesso.`,
  };
}

export async function createUserAction(
  _prev: EquipeState,
  formData: FormData,
): Promise<EquipeState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Apenas administradores podem adicionar usuários." };

  const parsed = newUserSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: formData.get("password") ? String(formData.get("password")) : "",
    role: text(formData, "role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "Este e-mail já está cadastrado no sistema." };
  }

  try {
    await db.user.create({
      data: {
        companyId: admin.session.companyId,
        name,
        email,
        role,
        passwordHash: await hashPassword(password),
        permissions: [],
      },
    });

    await db.activityLog.create({
      data: {
        companyId: admin.session.companyId,
        userId: admin.user.id,
        action: "USER_CREATED",
        entity: "User",
        metadata: { name, email, role },
      },
    });

    revalidateTeam();
    return {
      success: "Usuário criado com sucesso.",
      createdEmail: email,
      createdPassword: password,
    };
  } catch (e) {
    console.error("[USER CREATE ERROR]", e);
    return { error: "Não foi possível criar o usuário. Tente novamente." };
  }
}
