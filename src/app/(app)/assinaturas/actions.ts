"use server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { rateLimit } from "@/server/security/rate-limit";
import { formatDateTime } from "@/lib/format";

export type CsvState = {
  error?: string;
  csv?: string;
  fileName?: string;
  count?: number;
};

const filterSchema = z.object({
  q: z.string().trim().max(120).default(""),
  method: z
    .string()
    .trim()
    .refine((v) => v === "" || ["TYPED", "DRAWN", "UPLOADED"].includes(v), "Método inválido")
    .default(""),
  from: z.string().trim().max(10).default(""),
  to: z.string().trim().max(10).default(""),
});

const METHOD_LABEL: Record<string, string> = {
  TYPED: "Digitada",
  DRAWN: "Desenhada",
  UPLOADED: "Enviada",
};

/** Escapa um valor para CSV (separador ";"), sempre entre aspas. */
function csvCell(value: string | null | undefined): string {
  const v = (value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${v.replace(/"/g, '""')}"`;
}

/** Converte uma data "YYYY-MM-DD" em Date no início/fim do dia (horário local). */
function parseDay(value: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Gera um CSV com o histórico de assinaturas da empresa.
 * A resposta volta como string para o cliente exibir e copiar.
 */
export async function exportarAssinaturas(_: CsvState, formData: FormData): Promise<CsvState> {
  // Fora do try: o redirect de requireUser() não pode ser engolido pelo catch.
  const session = await requireUser();
  const { companyId, userId } = session;

  try {
    if (!rateLimit(`assinaturas:export:${userId}`, 10, 60_000)) {
      return { error: "Muitas exportações em pouco tempo. Aguarde um minuto e tente novamente." };
    }

    const parsed = filterSchema.safeParse({
      q: formData.get("q") ?? "",
      method: formData.get("method") ?? "",
      from: formData.get("from") ?? "",
      to: formData.get("to") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Filtros inválidos." };
    }

    const { q, method, from, to } = parsed.data;
    const fromDate = parseDay(from, false);
    const toDate = parseDay(to, true);

    const signerWhere: Prisma.SignerWhereInput = { contract: { companyId } };
    if (q) {
      signerWhere.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const signatures = await db.signature.findMany({
      where: {
        signer: signerWhere,
        ...(method ? { method: method as "TYPED" | "DRAWN" | "UPLOADED" } : {}),
        ...(fromDate || toDate
          ? {
              signedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { signedAt: "desc" },
      take: 1000,
      include: {
        signer: {
          select: {
            name: true,
            email: true,
            contract: { select: { number: true, title: true } },
          },
        },
      },
    });

    const header = [
      "Signatário",
      "E-mail",
      "Contrato",
      "Título do contrato",
      "Método",
      "Data da assinatura",
      "IP",
      "Código único",
      "Hash do documento",
    ];

    const lines = signatures.map((s) =>
      [
        csvCell(s.signer.name),
        csvCell(s.signer.email),
        csvCell(s.signer.contract.number),
        csvCell(s.signer.contract.title),
        csvCell(METHOD_LABEL[s.method] ?? s.method),
        csvCell(formatDateTime(s.signedAt)),
        csvCell(s.ip),
        csvCell(s.uniqueCode),
        csvCell(s.documentSha256),
      ].join(";"),
    );

    const csv = [header.map(csvCell).join(";"), ...lines].join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);

    return {
      csv,
      fileName: `assinaturas-${stamp}.csv`,
      count: signatures.length,
    };
  } catch (e) {
    console.error("[EXPORT SIGNATURES ERROR]", e);
    return { error: "Não foi possível gerar o CSV. Tente novamente." };
  }
}
