import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { requireUser } from "@/server/session";
import { buildContractHtml } from "../../(app)/contratos/html";
import { buildVariables } from "@/lib/variables";
import { createSignerFields } from "@/lib/signature-fields";
import { hashToken, randomToken, sha256 } from "@/lib/contract";
import { sendEmail, signatureRequestEmail, isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    clientName: z.string().trim().min(2, "Informe o nome do cliente").max(120),
    clientEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(254),
    clientDocument: z.string().trim().max(20).optional().or(z.literal("")),
    clientAddress: z.string().trim().max(240).optional().or(z.literal("")),
    title: z.string().trim().min(3, "Informe o título do contrato").max(160),
    templateId: z.string().trim().optional().or(z.literal("")),
    value: z.string().trim().optional().or(z.literal("")),
    startDate: z.string().trim().optional().or(z.literal("")),
    endDate: z.string().trim().optional().or(z.literal("")),
    expiresInDays: z.string().trim().optional().or(z.literal("")),
    signerName: z.string().trim().min(2, "Informe o nome de quem recebe o documento").max(120),
    signerEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(254),
    vaultId: z.string().trim().optional().or(z.literal("")),
    newVaultName: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.value) {
      const n = Number(data.value);
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Informe um valor numérico (ex.: 500,00)" });
      }
    }
    if (data.expiresInDays) {
      const n = Number(data.expiresInDays);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresInDays"],
          message: "Informe um número de dias entre 1 e 365",
        });
      }
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data de término não pode ser antes do início",
      });
    }
  });

/** Converte "1.500,00" ou "500,00" para "1500.00" (aceita vírgula do teclado BR). */
function normalizeNumber(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const FIELD_LABELS: Record<string, string> = {
  clientName: "Nome do cliente",
  clientEmail: "E-mail do cliente",
  clientDocument: "CPF/CNPJ do cliente",
  clientAddress: "Endereço do cliente",
  title: "Título do contrato",
  templateId: "Modelo de contrato",
  value: "Valor",
  startDate: "Data de início",
  endDate: "Data de término",
  expiresInDays: "Prazo do link",
  signerName: "Nome de quem recebe o documento",
  signerEmail: "E-mail de quem recebe o documento",
  vaultId: "Cofre",
  newVaultName: "Nome do cofre",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = schema.safeParse({
    ...(body as Record<string, unknown>),
    value: normalizeNumber(String((body as Record<string, unknown>)?.value ?? "")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    const problems = Object.entries(fieldErrors).map(
      ([key, msg]) => `${FIELD_LABELS[key] ?? key}: ${msg}`
    );
    return NextResponse.json(
      {
        error: `Revise ${problems.length === 1 ? "este campo" : "estes campos"}: ${problems.join(" · ")}`,
        fieldErrors,
      },
      { status: 422 }
    );
  }
  const data = parsed.data;

  const session = await requireUser();
  const { companyId, userId } = session;

  if (!rateLimit(`contract:create:${userId}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Você criou contratos demais em pouco tempo. Aguarde um minuto e tente novamente." },
      { status: 429 }
    );
  }

  try {
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
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 400 });

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
      const vault = await db.vault.findFirst({ where: { id: data.vaultId, companyId }, select: { id: true } });
      if (!vault) {
        return NextResponse.json(
          { error: "Revise estes campos: Cofre: Cofre inválido", fieldErrors: { vaultId: "Selecione um cofre válido" } },
          { status: 422 }
        );
      }
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
      return NextResponse.json(
        { error: "Revise estes campos: Modelo de contrato: Modelo inválido", fieldErrors: { templateId: "Selecione um modelo válido" } },
        { status: 422 }
      );
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
    const variables = buildVariables(extractVariableKeys(templateHtml), {
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
    const origin = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
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

    return NextResponse.json({
      success: true,
      link,
      emailed,
      contractNumber: number,
      signerEmail: data.signerEmail,
      error: emailError,
    });
  } catch (e) {
    console.error("[CRIAR CONTRATO]", e);
    return NextResponse.json(
      { error: "Erro interno ao criar o contrato. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

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
