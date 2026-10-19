"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DocumentKind } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import {
  createSignedUrl,
  isStorageConfigured,
  MAX_UPLOAD_BYTES,
  STORAGE_NOT_CONFIGURED_MESSAGE,
  uploadToStorage,
} from "@/lib/storage";

export type VaultDetailState = { error?: string; success?: string };

const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

const fileSchema = z
  .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
    message: "Selecione um arquivo para enviar.",
  })
  .refine((file) => file.name.trim().length > 0, "O arquivo precisa ter um nome.")
  .refine((file) => file.name.length <= 180, "O nome do arquivo é muito longo.")
  .refine((file) => file.size > 0, "O arquivo está vazio.")
  .refine(
    (file) => file.size <= MAX_UPLOAD_BYTES,
    `O arquivo deve ter no máximo ${MAX_UPLOAD_MB} MB.`,
  );

const uploadSchema = z.object({
  kind: z.nativeEnum(DocumentKind, {
    errorMap: () => ({ message: "Selecione o tipo do documento." }),
  }),
  file: fileSchema,
});

/** Guarda um contrato da empresa neste cofre (inclusive movendo de outro cofre). */
export async function addContractToVault(
  _: VaultDetailState,
  formData: FormData,
): Promise<VaultDetailState> {
  try {
    const session = await requireUser();
    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    if (!vaultId.success) {
      return { error: "Cofre inválido." };
    }
    const contractId = z.string().uuid().safeParse(formData.get("contractId"));
    if (!contractId.success) {
      return { error: "Selecione um contrato para guardar no cofre." };
    }

    const vault = await db.vault.findFirst({
      where: { id: vaultId.data, companyId: session.companyId },
      select: { id: true, name: true },
    });
    if (!vault) {
      return { error: "Cofre não encontrado." };
    }

    const contract = await db.contract.findFirst({
      where: { id: contractId.data, companyId: session.companyId, deletedAt: null },
      select: { id: true, number: true, title: true, vaultId: true },
    });
    if (!contract) {
      return { error: "Contrato não encontrado." };
    }
    if (contract.vaultId === vault.id) {
      return { error: "Este contrato já está guardado neste cofre." };
    }

    await db.contract.update({
      where: { id: contract.id },
      data: { vaultId: vault.id },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "CONTRACT_VAULTED",
        entity: "Contract",
        entityId: contract.id,
        metadata: { vaultId: vault.id, vaultName: vault.name, number: contract.number },
      },
    });

    revalidatePath("/cofre");
    revalidatePath(`/cofre/${vault.id}`);
    return { success: `Contrato ${contract.number} guardado no cofre.` };
  } catch (e) {
    console.error("[ADD CONTRACT TO VAULT ERROR]", e);
    return { error: "Não foi possível guardar o contrato no cofre." };
  }
}

/** Remove o contrato do cofre (o contrato continua existindo na empresa). */
export async function removeContractFromVault(
  _: VaultDetailState,
  formData: FormData,
): Promise<VaultDetailState> {
  try {
    const session = await requireUser();
    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    const contractId = z.string().uuid().safeParse(formData.get("contractId"));
    if (!vaultId.success || !contractId.success) {
      return { error: "Contrato ou cofre inválido." };
    }

    const contract = await db.contract.findFirst({
      where: { id: contractId.data, companyId: session.companyId, deletedAt: null },
      select: { id: true, number: true, vaultId: true },
    });
    if (!contract) {
      return { error: "Contrato não encontrado." };
    }

    await db.contract.update({
      where: { id: contract.id },
      data: { vaultId: null },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "CONTRACT_UNVAULTED",
        entity: "Contract",
        entityId: contract.id,
        metadata: { vaultId: vaultId.data, number: contract.number },
      },
    });

    revalidatePath("/cofre");
    revalidatePath(`/cofre/${vaultId.data}`);
    return { success: `Contrato ${contract.number} removido do cofre.` };
  } catch (e) {
    console.error("[REMOVE CONTRACT FROM VAULT ERROR]", e);
    return { error: "Não foi possível remover o contrato do cofre." };
  }
}

/** Envia um documento para o cofre (upload no Supabase Storage). */
export async function uploadDocument(
  _: VaultDetailState,
  formData: FormData,
): Promise<VaultDetailState> {
  try {
    const session = await requireUser();

    if (!rateLimit(`vault-upload:${session.userId}`, 30, 5 * 60_000)) {
      return { error: "Muitos envios em pouco tempo. Aguarde alguns minutos e tente novamente." };
    }

    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    if (!vaultId.success) {
      return { error: "Cofre inválido." };
    }

    const parsed = uploadSchema.safeParse({
      kind: formData.get("kind"),
      file: formData.get("file"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
    }

    const vault = await db.vault.findFirst({
      where: { id: vaultId.data, companyId: session.companyId },
      select: { id: true, name: true },
    });
    if (!vault) {
      return { error: "Cofre não encontrado." };
    }

    if (!isStorageConfigured()) {
      return { error: STORAGE_NOT_CONFIGURED_MESSAGE };
    }

    const file = parsed.data.file;
    const { key, sha256 } = await uploadToStorage(
      file,
      `vaults/${session.companyId}/${vault.id}`,
    );

    await db.document.create({
      data: {
        companyId: session.companyId,
        vaultId: vault.id,
        kind: parsed.data.kind,
        storageKey: key,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        sha256,
        createdBy: session.userId,
      },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "DOCUMENT_UPLOADED",
        entity: "Document",
        entityId: null,
        metadata: { vaultId: vault.id, vaultName: vault.name, fileName: file.name },
      },
    });

    revalidatePath(`/cofre/${vault.id}`);
    revalidatePath("/cofre");
    return { success: `Documento "${file.name}" enviado com sucesso.` };
  } catch (e) {
    console.error("[UPLOAD DOCUMENT ERROR]", e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("Storage não configurado")) {
      return { error: STORAGE_NOT_CONFIGURED_MESSAGE };
    }
    return { error: `Não foi possível enviar o documento. ${message}` };
  }
}

/** Remove um documento do cofre (exclusão lógica). */
export async function removeDocument(
  _: VaultDetailState,
  formData: FormData,
): Promise<VaultDetailState> {
  try {
    const session = await requireUser();
    const vaultId = z.string().uuid().safeParse(formData.get("vaultId"));
    const documentId = z.string().uuid().safeParse(formData.get("documentId"));
    if (!vaultId.success || !documentId.success) {
      return { error: "Documento ou cofre inválido." };
    }

    const document = await db.document.findFirst({
      where: { id: documentId.data, companyId: session.companyId, deletedAt: null },
      select: { id: true, fileName: true },
    });
    if (!document) {
      return { error: "Documento não encontrado." };
    }

    await db.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        action: "DOCUMENT_DELETED",
        entity: "Document",
        entityId: document.id,
        metadata: { vaultId: vaultId.data, fileName: document.fileName },
      },
    });

    revalidatePath(`/cofre/${vaultId.data}`);
    revalidatePath("/cofre");
    return { success: `Documento "${document.fileName}" removido do cofre.` };
  } catch (e) {
    console.error("[REMOVE DOCUMENT ERROR]", e);
    return { error: "Não foi possível remover o documento do cofre." };
  }
}

/** Gera a URL assinada do documento e redireciona para o download. */
export async function downloadDocument(
  _: VaultDetailState,
  formData: FormData,
): Promise<VaultDetailState> {
  const session = await requireUser();
  const documentId = z.string().uuid().safeParse(formData.get("documentId"));
  if (!documentId.success) {
    return { error: "Documento inválido." };
  }

  const document = await db.document.findFirst({
    where: { id: documentId.data, companyId: session.companyId, deletedAt: null },
    select: { id: true, fileName: true, storageKey: true },
  });
  if (!document) {
    return { error: "Documento não encontrado." };
  }

  if (!isStorageConfigured()) {
    return { error: STORAGE_NOT_CONFIGURED_MESSAGE };
  }

  const signedUrl = await createSignedUrl(document.storageKey).catch(() => null);
  if (!signedUrl) {
    return { error: "Não foi possível gerar o link de download deste documento." };
  }

  redirect(signedUrl);
}
