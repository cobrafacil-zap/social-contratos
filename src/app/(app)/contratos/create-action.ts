"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { requireUser } from "@/server/session";
import { buildContractHtml } from "./html";
import { buildVariables } from "@/lib/variables";
import { createSignerFields } from "@/lib/signature-fields";
import { hashToken, randomToken, sha256 } from "@/lib/contract";
import { sendEmail, signatureRequestEmail, isEmailConfigured } from "@/lib/email";
import { fieldErrorsFrom } from "./shared";
import type { ContractFormState } from "./shared";

const schema = z.object({
  clientName: z.string().trim().min(2, "Informe o nome do cliente").max(120, "Nome muito longo"),
  clientEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(254, "E-mail muito longo"),
  clientDocument: z.string().trim().max(20, "Documento muito longo").optional().or(z.literal("")),
  clientAddress: z.string().trim().max(240, "Endereço muito longo").optional().or(z.literal("")),
  title: z.string().trim().min(3, "Informe o título do contrato").max(160, "Título muito longo"),
  templateId: z.string().trim().optional().or(z.literal("")),
  value: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
  expiresInDays: z.string().trim().optional().or(z.literal("")),
  signerName: z.string().trim().min(2, "Informe o nome de quem assina").max(120, "Nome muito longo"),
  signerEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(254, "E-mail muito longo"),
  vaultId: z.string().trim().optional().or(z.literal("")),
  newVaultName: z.string().trim().max(120, "Nome do cofre muito longo").optional().or(z.literal("")),
});

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Cria o contrato, gera o link de assinatura e envia o e-mail — tudo de uma vez.
 * É o caminho principal do app: o usuário não precisa de passos extras.
 */
export async function createAndSendContractAction(
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const { companyId, userId } = await requireUser();

  if (!rateLimit(`contract:create:${userId}`, 30, 60_000)) {
    return { error: "Você criou contratos demais em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const parsed = schema.safeParse({
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    clientDocument: formData.get("clientDocument"),
    clientAddress: formData.get("clientAddress"),
    title: formData.get("title"),
    templateId: formData.get("templateId"),
    value: formData.get("value"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    expiresInDays: formData.get("expiresInDays"),
    signerName: formData.get("signerName"),
    signerEmail: formData.get("signerEmail"),
    vaultId: formData.get("vaultId"),
    newVaultName: formData.get("newVaultName"),
  });

  if (!parsed.success) {
    return { error: "Revise os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      legalName: true,
      cnpj: true,
      address: true,
      phone: true,
      email: true,
      responsibleName: true,
      contractPrefix: true,
    },
  });
  if (!company) return { error: "Empresa não encontrada." };

  /* ------------------------------- Cofre ------------------------------- */
  let vaultId: string | null = null;
  if (data.newVaultName && data.newVaultName.trim().length >= 2) {
    const vault = await db.vault.create({
      data: {
        companyId,
        name: data.newVaultName.trim(),
        description: null,
        isDefault: (await db.vault.count({ where: { companyId } })) === 0,
      },
      select: { id: true },
    });
    vaultId = vault.id;
  } else if (data.vaultId && data.vaultId !== "__novo__") {
    const vault = await db.vault.findFirst({
      where: { id: data.vaultId, companyId },
      select: { id: true },
    });
    if (!vault) return { error: "Cofre inválido.", fieldErrors: { vaultId: "Selecione um cofre válido" } };
    vaultId = vault.id;
  }

  /* ------------------------------- Cliente ------------------------------- */
  const clientSelect = {
    id: true,
    name: true,
    email: true,
    document: true,
    address: true,
    city: true,
    state: true,
    zip: true,
  } as const;

  // O e-mail do cliente não é único no banco: procuramos dentro da empresa.
  const existingClient = await db.client.findFirst({
    where: { companyId, email: data.clientEmail, deletedAt: null },
    select: clientSelect,
  });

  const client = existingClient
    ? await db.client.update({
        where: { id: existingClient.id },
        data: {
          name: data.clientName,
          document: data.clientDocument || existingClient.document || null,
          address: data.clientAddress || existingClient.address || null,
        },
        select: clientSelect,
      })
    : await db.client.create({
        data: {
          companyId,
          name: data.clientName,
          email: data.clientEmail,
          document: data.clientDocument || null,
          address: data.clientAddress || null,
          createdBy: userId,
        },
        select: clientSelect,
      });

  /* ------------------------------- Modelo ------------------------------- */
  const template = data.templateId
    ? await db.contractTemplate.findFirst({
        where: { id: data.templateId, companyId, deletedAt: null },
        select: { id: true, content: true, headerHtml: true, footerHtml: true },
      })
    : null;
  if (data.templateId && !template) {
    return { error: "Modelo inválido.", fieldErrors: { templateId: "Selecione um modelo válido" } };
  }

  /* ------------------------- Número e variáveis ------------------------- */
  const now = new Date();
  const year = now.getFullYear();
  const seq = await db.contractSequence.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, last: 1 },
    update: { last: { increment: 1 } },
  });
  const number = `${company.contractPrefix}-${year}-${String(seq.last).padStart(4, "0")}`;

  const startDate = toDate(data.startDate);
  const endDate = toDate(data.endDate);
  const expiresInDays = data.expiresInDays ? Number(data.expiresInDays) : 30;
  const expiresAt = new Date(now.getTime() + expiresInDays * 86_400_000);

  const templateHtml = template ? getTemplateHtml(template.content) : "";
  const keys = extractVariableKeys(templateHtml);
  const variables = buildVariables(keys, {
    company: {
      name: company.name,
      legalName: company.legalName,
      cnpj: company.cnpj,
      address: company.address,
      phone: company.phone,
      email: company.email,
      responsibleName: company.responsibleName,
    },
    client: {
      name: client.name,
      companyName: client.name,
      document: client.document,
      email: client.email,
      phone: null,
      address: client.address,
      city: client.city,
      state: client.state,
      zip: client.zip,
    },
    contract: {
      title: data.title,
      value: data.value || null,
      startDate,
      endDate,
      expiresInDays,
      object: data.title,
    },
    today: now,
  });

  const html = buildContractHtml({
    company: {
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      phone: company.phone,
      email: company.email,
      cnpj: company.cnpj,
      responsibleName: company.responsibleName,
    },
    title: data.title,
    number,
    clientName: client.name,
    variables,
    templateHtml: templateHtml || null,
    headerHtml: template?.headerHtml ?? null,
    footerHtml: template?.footerHtml ?? null,
  });

  /* ------------------------------- Contrato ------------------------------- */
  const contract = await db.contract.create({
    data: {
      companyId,
      number,
      title: data.title,
      clientId: client.id,
      templateId: template?.id ?? null,
      vaultId,
      ownerId: userId,
      createdBy: userId,
      status: "DRAFT",
      value: data.value || null,
      startDate,
      endDate,
      expiresAt,
      variables: variables as never,
    },
    select: { id: true },
  });

  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: { html } as never,
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: userId,
    },
    select: { id: true },
  });
  await db.contract.update({ where: { id: contract.id }, data: { currentVersionId: version.id } });

  /* --------------------- Signatário + link de assinatura --------------------- */
  const token = randomToken();
  const signer = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: data.signerName,
      email: data.signerEmail,
      role: "Contratante",
      order: 1,
      status: "PENDING",
      tokenHash: hashToken(token),
      tokenExpiresAt: expiresAt,
    },
    select: { id: true },
  });
  await createSignerFields(version.id, signer.id, "Contratante");
  await db.contractVersion.update({ where: { id: version.id }, data: { isLocked: true, lockedAt: now } });
  await db.contract.update({ where: { id: contract.id }, data: { status: "SENT", sentAt: now } });

  await db.activityLog.create({
    data: { companyId, userId, action: "CONTRACT_SENT", entity: "Contract", entityId: contract.id },
  });

  /* -------------------------------- E-mail -------------------------------- */
  const origin = await currentOrigin();
  const link = `${origin}/s/${token}`;

  let emailed = 0;
  let emailError: string | undefined;

  if (isEmailConfigured()) {
    const mail = signatureRequestEmail({
      companyName: company.name,
      contractTitle: data.title,
      contractNumber: number,
      signerName: data.signerName,
      role: "Contratante",
      signUrl: link,
      expiresAt,
    });
    const sent = await sendEmail({
      to: data.signerEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (sent.ok) emailed = 1;
    else emailError = `Não foi possível enviar o e-mail: ${sent.error}`;
  } else {
    emailError = "E-mail não configurado (RESEND_API_KEY). Envie o link manualmente.";
  }

  revalidatePath("/contratos");
  revalidatePath("/dashboard");

  return {
    success: true,
    link,
    emailed,
    contractNumber: number,
    signerEmail: data.signerEmail,
    error: emailError,
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getTemplateHtml(content: unknown): string {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const html = (content as { html?: unknown }).html;
    if (typeof html === "string") return html;
  }
  return "";
}

function extractVariableKeys(html: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

async function currentOrigin(): Promise<string> {
  const env = process.env.APP_URL;
  if (env) return env.replace(/\/+$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
