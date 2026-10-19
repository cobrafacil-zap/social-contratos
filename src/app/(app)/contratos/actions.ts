"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { nextContractNumber, sha256 } from "@/lib/contract";
import { buildContractHtml, getTemplateHtml } from "./html";
import {
  contractPayloadSchema,
  fieldErrorsFrom,
  stepForField,
  type ContractFormState,
  type SignerInput,
} from "./shared";

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

/**
 * Cria um contrato (rascunho) a partir do wizard.
 * Todas as queries são filtradas pela empresa da sessão.
 */
export async function createContractAction(
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const session = await requireUser();
  const { companyId, userId } = session;

  if (!rateLimit(`contract:create:${userId}`, 30, 60_000)) {
    return { error: "Você criou contratos demais em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  const rawVariables = parseJson<Record<string, string>>(str(formData.get("variables")), {});
  if (!rawVariables.ok) {
    return {
      error: "Não foi possível ler as variáveis do contrato.",
      invalidStep: 3,
      fieldErrors: { variables: "Variáveis inválidas" },
    };
  }
  const rawSigners = parseJson<SignerInput[]>(str(formData.get("signers")), []);
  if (!rawSigners.ok) {
    return {
      error: "Não foi possível ler a lista de signatários.",
      invalidStep: 3,
      fieldErrors: { signers: "Lista de signatários inválida" },
    };
  }

  const payload = {
    clientId: str(formData.get("clientId")),
    title: str(formData.get("title")),
    templateId: str(formData.get("templateId")),
    value: str(formData.get("value")),
    startDate: str(formData.get("startDate")),
    endDate: str(formData.get("endDate")),
    expiresInDays: str(formData.get("expiresInDays")),
    vaultId: str(formData.get("vaultId")),
    newVaultName: str(formData.get("newVaultName")),
    newVaultDescription: str(formData.get("newVaultDescription")),
    variables: rawVariables.data,
    signers: rawSigners.data,
  };

  const parsed = contractPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    const firstField = Object.keys(fieldErrors)[0] ?? "_";
    return {
      error: "Revise os campos destacados para continuar.",
      fieldErrors,
      invalidStep: stepForField(firstField),
    };
  }
  const data = parsed.data;

  if (data.newVaultName && data.newVaultName.length < 2) {
    return {
      error: "Revise os campos destacados para continuar.",
      fieldErrors: { newVaultName: "Informe o nome do cofre" },
      invalidStep: 2,
    };
  }

  // Cliente precisa existir na empresa da sessão.
  const client = await db.client.findFirst({
    where: { id: data.clientId, companyId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!client) {
    return {
      error: "Cliente não encontrado.",
      fieldErrors: { clientId: "Selecione um cliente válido" },
      invalidStep: 1,
    };
  }

  // Modelo (opcional) precisa existir na empresa da sessão.
  const template = data.templateId
    ? await db.contractTemplate.findFirst({
        where: { id: data.templateId, companyId, deletedAt: null },
        select: { id: true, content: true, headerHtml: true, footerHtml: true },
      })
    : null;
  if (data.templateId && !template) {
    return {
      error: "Modelo não encontrado.",
      fieldErrors: { templateId: "Selecione um modelo válido" },
      invalidStep: 1,
    };
  }

  // Cofre: usa o selecionado ou cria o novo informado no passo 2.
  let vaultId: string | null = null;
  if (data.newVaultName) {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { primaryColor: true },
    });
    const hasDefault = await db.vault.findFirst({ where: { companyId, isDefault: true }, select: { id: true } });
    const vault = await db.vault.create({
      data: {
        companyId,
        name: data.newVaultName,
        description: data.newVaultDescription || null,
        color: company?.primaryColor ?? "#2F4BFF",
        isDefault: !hasDefault,
      },
      select: { id: true },
    });
    vaultId = vault.id;
  } else if (data.vaultId) {
    const vault = await db.vault.findFirst({
      where: { id: data.vaultId, companyId },
      select: { id: true },
    });
    if (!vault) {
      return {
        error: "Cofre não encontrado.",
        fieldErrors: { vaultId: "Selecione um cofre válido" },
        invalidStep: 2,
      };
    }
    vaultId = vault.id;
  }

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
      contractPrefix: true,
    },
  });
  if (!company) return { error: "Empresa não encontrada." };

  const now = new Date();
  const year = now.getFullYear();
  const number = await nextContractNumber(companyId, company.contractPrefix, year);

  const startDate = toDate(data.startDate);
  const endDate = toDate(data.endDate);
  const expiresAt = data.expiresInDays ? new Date(now.getTime() + data.expiresInDays * 86_400_000) : null;

  const html = buildContractHtml({
    company,
    title: data.title,
    number,
    clientName: client.name,
    variables: data.variables,
    templateHtml: template ? getTemplateHtml(template.content) : null,
    headerHtml: template?.headerHtml ?? null,
    footerHtml: template?.footerHtml ?? null,
  });

  const contract = await db.contract.create({
    data: {
      companyId,
      number,
      title: data.title,
      clientId: client.id,
      templateId: template?.id ?? null,
      vaultId,
      ownerId: userId,
      status: "DRAFT",
      value: data.value ?? null,
      startDate,
      endDate,
      expiresAt,
      variables: data.variables as Prisma.InputJsonValue,
      createdBy: userId,
    },
    select: { id: true },
  });

  // Os signatários previstos ficam registrados no conteúdo da versão;
  // as linhas em `Signer` só são criadas no momento do envio para assinatura.
  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: { html, signers: data.signers } as Prisma.InputJsonValue,
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: userId,
    },
    select: { id: true },
  });

  await db.contract.update({ where: { id: contract.id }, data: { currentVersionId: version.id } });

  await db.activityLog.create({
    data: {
      companyId,
      userId,
      action: "CONTRACT_CREATED",
      entity: "Contract",
      entityId: contract.id,
      metadata: { number, signers: data.signers.length } as Prisma.InputJsonValue,
    },
  });

  redirect(`/contratos/${contract.id}`);
}
