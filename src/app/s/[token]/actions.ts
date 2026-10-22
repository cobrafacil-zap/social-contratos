"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/server/db";
import { hashToken, randomToken, sha256 } from "@/lib/contract";
import { buildAuditHash } from "@/lib/audit";
import { rateLimit } from "@/server/security/rate-limit";
import {
  isEmailConfigured,
  sendEmail,
  signatureCompletedNoticeEmail,
  signatureThankYouEmail,
} from "@/lib/email";

export type SignState = {
  error?: string;
  success?: string;
  refused?: string;
};

const fieldSchema = z.object({
  fieldId: z.string().uuid().optional(),
  type: z.enum(["SIGNATURE", "FULL_NAME", "CPF", "DATE", "TEXT", "CHECKBOX", "INITIALS"]),
  value: z.string().max(5000).optional(),
  method: z.enum(["TYPED", "DRAWN"]).optional(),
});

const signSchema = z.object({
  fields: z.string().min(1),
  terms: z.string().optional(),
});

function parseFields(raw: string): z.infer<typeof fieldSchema>[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f) => f && typeof f === "object");
  } catch {
    return [];
  }
}

export async function signContractAction(_: SignState, formData: FormData, token: string): Promise<SignState> {
  const parsed = signSchema.safeParse({
    fields: formData.get("fields"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { error: "Dados inválidos. Recarregue a página e tente novamente." };

  if (!rateLimit(`sign:${token}`, 20, 15 * 60_000)) {
    return { error: "Muitas tentativas nesta página. Aguarde alguns minutos." };
  }

  const tokenHash = hashToken(token);
  const signer = await db.signer.findUnique({
    where: { tokenHash },
    include: {
      contract: { include: { client: true, company: true } },
      version: true,
      fields: true,
    },
  });

  if (!signer) return { error: "Link de assinatura inválido." };
  if (signer.tokenRevokedAt) return { error: "Este link de assinatura foi revogado." };
  if (signer.tokenExpiresAt && signer.tokenExpiresAt.getTime() < Date.now()) {
    return { error: "Este link de assinatura expirou. Peça um novo link ao responsável." };
  }
  if (signer.status === "SIGNED") return { error: "Este documento já foi assinado por você." };

  const values = parseFields(parsed.data.fields);
  const required = signer.fields.filter((f) => f.required);

  for (const sf of required) {
    const v = values.find((x) => x.fieldId === sf.id);
    if (!v || !v.value) {
      return { error: `Preencha o campo obrigatório: ${sf.label ?? sf.type}.` };
    }
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;
  const documentSha256 = sha256(signer.version.renderedHtml);

  try {
    for (const sf of signer.fields) {
      const v = values.find((x) => x.fieldId === sf.id);
      if (!v || !v.value) continue;
      const method = sf.type === "SIGNATURE" ? (v.method ?? "TYPED") : "TYPED";
      await db.signature.create({
        data: {
          signerId: signer.id,
          fieldId: sf.id,
          method: method as "TYPED" | "DRAWN" | "UPLOADED",
          imageKey: method === "DRAWN" ? v.value : null,
          typedName: method === "TYPED" && sf.type === "SIGNATURE" ? v.value : null,
          documentSha256,
          termsAcceptedAt: new Date(),
          signedAt: new Date(),
          ip,
          userAgent,
          uniqueCode: randomToken(9).toUpperCase(),
        },
      });
    }

    await db.signer.update({
      where: { id: signer.id },
      data: { status: "SIGNED", signedAt: new Date(), viewedAt: signer.viewedAt ?? new Date() },
    });

    // Verifica se todos os signatários concluíram
    const remaining = await db.signer.count({
      where: { contractId: signer.contractId, status: { not: "SIGNED" } },
    });
    const allSigned = remaining === 0;

    await db.contract.update({
      where: { id: signer.contractId },
      data: allSigned
        ? { status: "SIGNED", completedAt: new Date() }
        : { status: "PARTIALLY_SIGNED" },
    });

    const auditPayload = {
      type: "CONTRACT_SIGNED",
      signerId: signer.id,
      signerName: signer.name,
      documentSha256,
    };
    const { hash, prevHash } = await buildAuditHash(signer.contract.companyId, auditPayload);

    await db.auditEvent.create({
      data: {
        companyId: signer.contract.companyId,
        contractId: signer.contractId,
        signerId: signer.id,
        type: "CONTRACT_SIGNED",
        actorType: "SIGNER",
        actorId: signer.id,
        ip,
        userAgent,
        metadata: { signerName: signer.name, email: signer.email },
        hash,
        prevHash,
      },
    });

    await db.notification.create({
      data: {
        companyId: signer.contract.companyId,
        type: "CONTRACT_SIGNED",
        title: `${signer.name} assinou o contrato ${signer.contract.number}`,
        body: allSigned
          ? "Todos os signatários concluíram. O contrato está assinado."
          : "Ainda há signatários pendentes neste contrato.",
        contractId: signer.contractId,
      },
    });

    // --------- E-mails: agradece ao cliente e avisa a empresa ----------
    if (isEmailConfigured()) {
      const appUrl = (process.env.APP_URL || "https://social-contratos.vercel.app").replace(/\/$/, "");
      const company = signer.contract.company;
      const signUrl = `${appUrl}/s/${token}`;
      const signedAt = new Date();

      // 1) Obrigado ao cliente, por fazer parte da equipe.
      const thanks = signatureThankYouEmail({
        companyName: company.name,
        contractTitle: signer.contract.title,
        contractNumber: signer.contract.number,
        signerName: signer.name,
        signUrl,
      });
      await sendEmail({ to: signer.email, subject: thanks.subject, html: thanks.html, text: thanks.text });

      // 2) Aviso para a empresa de que o cliente assinou.
      // Destinatário: NOTIFY_EMAIL (dedicado) > e-mail da empresa > reply-to.
      const adminEmail =
        process.env.NOTIFY_EMAIL || company.email || process.env.EMAIL_REPLY_TO || "";
      if (adminEmail) {
        const notice = signatureCompletedNoticeEmail({
          companyName: company.name,
          contractTitle: signer.contract.title,
          contractNumber: signer.contract.number,
          signerName: signer.name,
          signerEmail: signer.email,
          signedAt,
          allSigned,
          signUrl: `${appUrl}/contratos/${signer.contractId}`,
        });
        await sendEmail({ to: adminEmail, subject: notice.subject, html: notice.html, text: notice.text });
      }
    }

    return { success: allSigned ? "Contrato assinado com sucesso!" : "Assinatura registrada com sucesso!" };
  } catch (e) {
    console.error("[SIGN ERROR]", e);
    return { error: "Não foi possível registrar a assinatura. Tente novamente." };
  }
}

export async function refuseContractAction(_: SignState, formData: FormData, token: string): Promise<SignState> {
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (reason.length < 5) return { error: "Descreva o motivo da recusa (mínimo 5 caracteres)." };

  const tokenHash = hashToken(token);
  const signer = await db.signer.findUnique({
    where: { tokenHash },
    include: { contract: true },
  });
  if (!signer) return { error: "Link de assinatura inválido." };
  if (signer.status === "SIGNED") return { error: "Este documento já foi assinado." };

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await db.signer.update({
      where: { id: signer.id },
      data: { status: "REFUSED", refusedAt: new Date(), refusalReason: reason },
    });
    await db.contract.update({ where: { id: signer.contractId }, data: { status: "REFUSED" } });
    const auditPayload = { type: "CONTRACT_REFUSED", signerId: signer.id, reason };
    const { hash, prevHash } = await buildAuditHash(signer.contract.companyId, auditPayload);

    await db.auditEvent.create({
      data: {
        companyId: signer.contract.companyId,
        contractId: signer.contractId,
        signerId: signer.id,
        type: "CONTRACT_REFUSED",
        actorType: "SIGNER",
        actorId: signer.id,
        ip,
        metadata: { reason },
        hash,
        prevHash,
      },
    });
    await db.notification.create({
      data: {
        companyId: signer.contract.companyId,
        type: "CONTRACT_REFUSED",
        title: `${signer.name} recusou assinar o contrato ${signer.contract.number}`,
        body: reason,
        contractId: signer.contractId,
      },
    });
    return { refused: "Recusa registrada. O responsável da empresa foi notificado." };
  } catch (e) {
    console.error("[REFUSE ERROR]", e);
    return { error: "Não foi possível registrar a recusa. Tente novamente." };
  }
}
