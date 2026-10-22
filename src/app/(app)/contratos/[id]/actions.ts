"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { nextContractNumber, randomToken, hashToken, sha256 } from "@/lib/contract";
import { createSignerFields } from "@/lib/signature-fields";
import { sendEmail, signatureRequestEmail, isEmailConfigured } from "@/lib/email";
import { buildContractHtml, getTemplateHtml } from "../html";
import {
  contractUpdateSchema,
  fieldErrorsFrom,
  getVersionSigners,
  signersSchema,
  type ContractFormState,
  type SendContractState,
  type SignerInput,
} from "../shared";

const SIGNATURE_DAYS = 30;

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson<T>(value: string, fallback: T): { ok: true; data: T } | { ok: false } {
  if (!value) return { ok: true, data: fallback };
  try {
    return { ok: true, data: JSON.parse(value) as T };
  } catch {
    return { ok: false };
  }
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/* -------------------------------------------------------------------------- */
/* Envio para assinatura                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Cria os signatários (com token de assinatura) a partir dos dados enviados,
 * trava a versão atual e muda o contrato para "Enviado".
 * O token em claro é devolvido apenas nesta resposta — no banco fica só o hash.
 */
export async function sendForSignatureAction(
  _prev: SendContractState,
  formData: FormData
): Promise<SendContractState> {
  const session = await requireUser();
  const { companyId, userId } = session;

  if (!rateLimit(`contract:send:${userId}`, 30, 60_000)) {
    return { error: "Você enviou contratos demais em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const contractId = str(formData.get("contractId"));
  const sendEmailChecked = formData.get("sendEmail") === "on" || formData.get("sendEmail") === "true";
  const contract = await db.contract.findFirst({
    where: { id: contractId, companyId, deletedAt: null },
    select: {
      id: true,
      status: true,
      title: true,
      number: true,
      currentVersionId: true,
      _count: { select: { signers: { where: { status: "SIGNED" } } } },
    },
  });
  if (!contract) return { error: "Contrato não encontrado." };

  // Rascunho: envia pela primeira vez. Outros status: reenvio, permitido apenas
  // enquanto nenhum signatário tiver assinado (o link em claro não fica salvo).
  const SENDABLE = ["DRAFT", "SENT", "VIEWED", "AWAITING", "PARTIALLY_SIGNED", "EXPIRED"];
  if (!SENDABLE.includes(contract.status)) {
    return { error: "Este contrato não pode mais ser enviado para assinatura." };
  }
  if (contract.status !== "DRAFT" && contract._count.signers > 0) {
    return {
      error: "Já existe uma assinatura registrada neste contrato. Não é possível gerar novos links.",
    };
  }

  // Versão que será enviada: a atual (ou a mais recente, se não houver atual).
  const current = contract.currentVersionId
    ? await db.contractVersion.findFirst({
        where: { id: contract.currentVersionId, contractId: contract.id },
        select: { id: true, versionNumber: true },
      })
    : await db.contractVersion.findFirst({
        where: { contractId: contract.id },
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true },
      });
  if (!current) return { error: "Este contrato ainda não tem uma versão para assinar." };

  const rawSigners = parseJson<SignerInput[]>(str(formData.get("signers")), []);
  if (!rawSigners.ok) {
    return { error: "Não foi possível ler a lista de signatários.", fieldErrors: { signers: "Lista inválida" } };
  }
  const parsed = signersSchema.safeParse(rawSigners.data);
  if (!parsed.success) {
    return {
      error: "Revise a lista de signatários.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const signers = parsed.data;

  // Remove signatários provisórios (sem assinatura) antes de recriar os links.
  const existing = await db.signer.findMany({
    where: { contractId: contract.id },
    select: { id: true, _count: { select: { signatures: true } } },
  });
  for (const s of existing) {
    if (s._count.signatures === 0) {
      // Remove os campos primeiro (FK restritiva) e depois o signatário.
      await db.signatureField.deleteMany({ where: { signerId: s.id } });
      await db.signer.delete({ where: { id: s.id } });
    }
  }

  const origin = await currentOrigin();
  const tokenExpiresAt = new Date(Date.now() + SIGNATURE_DAYS * 86_400_000);
  const links: { name: string; email: string; url: string }[] = [];
  const emailErrors: string[] = [];
  let emailed = 0;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  for (const [index, signer] of signers.entries()) {
    const token = randomToken();
    const created = await db.signer.create({
      data: {
        contractId: contract.id,
        versionId: current.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        order: index + 1,
        status: "PENDING",
        tokenHash: hashToken(token),
        tokenExpiresAt,
      },
    });
    // Cria os campos de preenchimento (nome, CPF, data e assinatura) do signatário.
    await createSignerFields(current.id, created.id, signer.role);
    const url = `${origin}/s/${token}`;
    links.push({ name: signer.name, email: signer.email, url });

    // Envia o link de assinatura para o e-mail do signatário.
    if (sendEmailChecked) {
      const mail = signatureRequestEmail({
        companyName: company?.name ?? "Social Sign",
        contractTitle: contract.title,
        contractNumber: contract.number,
        signerName: signer.name,
        signerEmail: signer.email,
        role: signer.role,
        signUrl: url,
        expiresAt: tokenExpiresAt,
      });
      const result = await sendEmail({
        to: signer.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
      });
      if (result.ok) emailed += 1;
      else emailErrors.push(`${signer.email}: ${result.error ?? "falha desconhecida"}`);
    }
  }

  await db.contractVersion.update({
    where: { id: current.id },
    data: { isLocked: true, lockedAt: new Date() },
  });

  await db.contract.update({
    where: { id: contract.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_SENT",
      entity: "Contract",
      entityId: contract.id,
      metadata: { signers: signers.length, versionNumber: current.versionNumber } as Prisma.InputJsonValue,
    },
  });

  return { links, emailed, emailErrors, emailConfigured: isEmailConfigured() };
}

/* -------------------------------------------------------------------------- */
/* Edição (nova versão)                                                       */
/* -------------------------------------------------------------------------- */

/** Salva as alterações criando uma nova versão do contrato. */
export async function updateContractAction(
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const session = await requireUser();
  const { companyId, userId } = session;

  if (!rateLimit(`contract:update:${userId}`, 60, 60_000)) {
    return { error: "Muitas edições em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const contractId = str(formData.get("contractId"));
  const contract = await db.contract.findFirst({
    where: { id: contractId, companyId, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      template: { select: { id: true, content: true, headerHtml: true, footerHtml: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });
  if (!contract) return { error: "Contrato não encontrado." };

  const rawVariables = parseJson<Record<string, string>>(str(formData.get("variables")), {});
  if (!rawVariables.ok) {
    return { error: "Não foi possível ler as variáveis do contrato.", fieldErrors: { variables: "Variáveis inválidas" } };
  }

  const parsed = contractUpdateSchema.safeParse({
    title: str(formData.get("title")),
    value: str(formData.get("value")),
    startDate: str(formData.get("startDate")),
    endDate: str(formData.get("endDate")),
    variables: rawVariables.data,
  });
  if (!parsed.success) {
    return { error: "Revise os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      legalName: true,
      address: true,
      phone: true,
      email: true,
      cnpj: true,
      responsibleName: true,
    },
  });
  if (!company) return { error: "Empresa não encontrada." };

  const lastVersion = contract.versions[0];
  const templateHtml = contract.template ? getTemplateHtml(contract.template.content) : null;

  const html = buildContractHtml({
    company,
    title: data.title,
    number: contract.number,
    clientName: contract.client.name,
    variables: data.variables,
    templateHtml,
    headerHtml: contract.template?.headerHtml ?? null,
    footerHtml: contract.template?.footerHtml ?? null,
  });

  const signers = getVersionSigners(lastVersion?.content);

  // A versão anterior permanece intacta (inclusive quando está travada).
  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
      content: { html, signers } as Prisma.InputJsonValue,
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: userId,
    },
    select: { id: true, versionNumber: true },
  });

  await db.contract.update({
    where: { id: contract.id },
    data: {
      title: data.title,
      value: data.value ?? null,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      variables: data.variables as Prisma.InputJsonValue,
      currentVersionId: version.id,
    },
  });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_UPDATED",
      entity: "Contract",
      entityId: contract.id,
      metadata: { versionNumber: version.versionNumber } as Prisma.InputJsonValue,
    },
  });

  redirect(`/contratos/${contract.id}`);
}

/* -------------------------------------------------------------------------- */
/* Ações secundárias                                                          */
/* -------------------------------------------------------------------------- */

/** Duplica o contrato criando um novo rascunho com novo número. */
export async function duplicateContractAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const { companyId, userId } = session;

  const id = str(formData.get("id"));
  const contract = await db.contract.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });
  if (!contract) redirect("/contratos");

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { contractPrefix: true, primaryColor: true },
  });

  const number = await nextContractNumber(
    companyId,
    company?.contractPrefix ?? "SOC",
    new Date().getFullYear()
  );

  const copy = await db.contract.create({
    data: {
      companyId,
      number,
      title: contract.title,
      clientId: contract.clientId,
      templateId: contract.templateId,
      vaultId: contract.vaultId,
      ownerId: userId,
      status: "DRAFT",
      value: contract.value,
      startDate: contract.startDate,
      endDate: contract.endDate,
      expiresAt: contract.expiresAt,
      variables: (contract.variables ?? {}) as Prisma.InputJsonValue,
      createdBy: userId,
    },
    select: { id: true },
  });

  const last = contract.versions[0];
  const html = last?.renderedHtml ?? "";
  const version = await db.contractVersion.create({
    data: {
      contractId: copy.id,
      versionNumber: 1,
      content: (last?.content ?? { html }) as Prisma.InputJsonValue,
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: userId,
    },
    select: { id: true },
  });

  await db.contract.update({ where: { id: copy.id }, data: { currentVersionId: version.id } });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_DUPLICATED",
      entity: "Contract",
      entityId: copy.id,
      metadata: { from: contract.id } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/contratos");
  redirect(`/contratos/${copy.id}`);
}

/** Cancela o contrato. */
export async function cancelContractAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const { companyId, userId } = session;

  const id = str(formData.get("id"));
  const contract = await db.contract.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!contract) redirect("/contratos");

  await db.contract.update({ where: { id: contract.id }, data: { status: "CANCELED" } });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_CANCELED",
      entity: "Contract",
      entityId: contract.id,
    },
  });

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contract.id}`);
  redirect(`/contratos/${contract.id}`);
}

/** Exclui o contrato (soft delete). */
export async function deleteContractAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const { companyId, userId } = session;

  const id = str(formData.get("id"));
  const contract = await db.contract.findFirst({
    where: { id, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!contract) redirect("/contratos");

  await db.contract.update({ where: { id: contract.id }, data: { deletedAt: new Date() } });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_DELETED",
      entity: "Contract",
      entityId: contract.id,
    },
  });

  revalidatePath("/contratos");
  redirect("/contratos");
}
