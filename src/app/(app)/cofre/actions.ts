"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";

export type VaultActionState = { error?: string; success?: string };

const vaultSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  description: z
    .string()
    .trim()
    .max(240, "A descrição deve ter no máximo 240 caracteres.")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal no formato #2F4BFF.")
    .default("#2F4BFF"),
});

/**
 * Garante que a empresa sempre tenha um cofre padrão disponível.
 * Idempotente: cria "Cofre principal" apenas quando não existe nenhum cofre.
 */
export async function ensureDefaultVault(companyId: string): Promise<void> {
  const total = await db.vault.count({ where: { companyId } });

  if (total === 0) {
    await db.vault.create({
      data: {
        companyId,
        name: "Cofre principal",
        description: "Cofre padrão da empresa, criado automaticamente.",
        color: "#2F4BFF",
        isDefault: true,
      },
    });
    return;
  }

  const current = await db.vault.findFirst({
    where: { companyId, isDefault: true },
    select: { id: true },
  });
  if (current) return;

  const oldest = await db.vault.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (oldest) {
    await db.vault.update({ where: { id: oldest.id }, data: { isDefault: true } });
  }
}

/** Cria ou renomeia/edita um cofre. */
export async function saveVault(
  _: VaultActionState,
  formData: FormData,
): Promise<VaultActionState> {
  try {
    const session = await requireUser();
    const parsed = vaultSchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      color: formData.get("color") || "#2F4BFF",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
    }

    const { id, name, description, color } = parsed.data;
    const descriptionValue = description && description.length > 0 ? description : null;

    if (id) {
      const existing = await db.vault.findFirst({
        where: { id, companyId: session.companyId },
        select: { id: true },
      });
      if (!existing) {
        return { error: "Cofre não encontrado." };
      }
      await db.vault.update({
        where: { id },
        data: { name, description: descriptionValue, color },
      });
      await db.activityLog.create({
        data: {
          companyId: session.companyId,
          userId: session.userId,
          action: "VAULT_UPDATED",
          entity: "Vault",
          entityId: id,
          metadata: { name },
        },
      });
      revalidatePath("/cofre");
      revalidatePath(`/cofre/${id}`);
      return { success: "Cofre atualizado com sucesso." };
    }

    const created = await db.vault.create({
      data: {
        companyId: session.companyId,
        name,
        description: descriptionValue,
        color,
        isDefault: false,
      },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "VAULT_CREATED",
        entity: "Vault",
        entityId: created.id,
        metadata: { name },
      },
    });

    revalidatePath("/cofre");
    return { success: "Cofre criado com sucesso." };
  } catch (e) {
    console.error("[SAVE VAULT ERROR]", e);
    return { error: "Não foi possível salvar o cofre. Tente novamente." };
  }
}

/** Define um cofre como padrão da empresa (desmarca os demais). */
export async function setDefaultVault(
  _: VaultActionState,
  formData: FormData,
): Promise<VaultActionState> {
  try {
    const session = await requireUser();
    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    if (!vaultId.success) {
      return { error: "Cofre inválido." };
    }

    const vault = await db.vault.findFirst({
      where: { id: vaultId.data, companyId: session.companyId },
      select: { id: true, name: true },
    });
    if (!vault) {
      return { error: "Cofre não encontrado." };
    }

    await db.$transaction([
      db.vault.updateMany({
        where: { companyId: session.companyId, NOT: { id: vault.id } },
        data: { isDefault: false },
      }),
      db.vault.update({ where: { id: vault.id }, data: { isDefault: true } }),
    ]);

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "VAULT_DEFAULT_SET",
        entity: "Vault",
        entityId: vault.id,
        metadata: { name: vault.name },
      },
    });

    revalidatePath("/cofre");
    revalidatePath(`/cofre/${vault.id}`);
    return { success: `"${vault.name}" agora é o cofre padrão.` };
  } catch (e) {
    console.error("[SET DEFAULT VAULT ERROR]", e);
    return { error: "Não foi possível definir o cofre padrão." };
  }
}

/** Exclui um cofre. Só é permitido quando não há contratos nem documentos guardados. */
export async function deleteVault(
  _: VaultActionState,
  formData: FormData,
): Promise<VaultActionState> {
  try {
    const session = await requireUser();
    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    if (!vaultId.success) {
      return { error: "Cofre inválido." };
    }
    if (formData.get("confirm") !== "on" && formData.get("confirm") !== "true") {
      return { error: "É necessário confirmar a exclusão do cofre." };
    }

    const vault = await db.vault.findFirst({
      where: { id: vaultId.data, companyId: session.companyId },
      select: {
        id: true,
        name: true,
        _count: { select: { contracts: true, documents: true } },
      },
    });
    if (!vault) {
      return { error: "Cofre não encontrado." };
    }

    if (vault._count.contracts > 0 || vault._count.documents > 0) {
      const partes: string[] = [];
      if (vault._count.contracts > 0) {
        partes.push(
          `${vault._count.contracts} contrato(s) guardado(s) — remova-os do cofre antes de excluí-lo.`,
        );
      }
      if (vault._count.documents > 0) {
        partes.push(
          `${vault._count.documents} documento(s) guardado(s) — remova-os do cofre antes de excluí-lo.`,
        );
      }
      return {
        error: `O cofre "${vault.name}" ainda possui conteúdo: ${partes.join(" ")}`,
      };
    }

    await db.vault.delete({ where: { id: vault.id } });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "VAULT_DELETED",
        entity: "Vault",
        entityId: vault.id,
        metadata: { name: vault.name },
      },
    });

    revalidatePath("/cofre");
    return { success: `O cofre "${vault.name}" foi excluído.` };
  } catch (e) {
    console.error("[DELETE VAULT ERROR]", e);
    return { error: "Não foi possível excluir o cofre. Tente novamente." };
  }
}
