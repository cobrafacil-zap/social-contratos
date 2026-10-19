import { db } from "@/server/db";
import { sha256 } from "@/lib/contract";

/**
 * Monta o hash encadeado do registro de auditoria.
 * Cada evento referencia o hash do anterior (prevHash), tornando a trilha imutável.
 */
export async function buildAuditHash(
  companyId: string,
  payload: Record<string, unknown>
): Promise<{ hash: string; prevHash: string | null }> {
  const last = await db.auditEvent.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  const prevHash = last?.hash ?? null;
  const hash = sha256(
    [prevHash ?? "", companyId, JSON.stringify(payload), new Date().toISOString()].join("|")
  );
  return { hash, prevHash };
}
