import { createHash, randomBytes, createHmac } from "crypto";

/** Gera hash SHA-256 de um conteúdo. */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Gera token aleatório seguro (URL-safe). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Gera hash de um token de assinatura (guarda apenas o hash no banco). */
export function hashToken(token: string): string {
  const pepper = process.env.TOKEN_PEPPER || "dev-pepper";
  return createHmac("sha256", pepper).update(token).digest("hex");
}

/** Extrai as variáveis {{var}} presentes em um template. */
export function extractVariables(html: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

/** Substitui {{var}} pelos valores informados. Variáveis vazias viram "—". */
export function renderTemplate(html: string, vars: Record<string, string | undefined>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null || v === "" ? "—" : String(v);
  });
}

/** Humaniza o nome da variável para rótulo de formulário. */
export function humanizeVar(key: string): string {
  const special: Record<string, string> = {
    cpf_cnpj: "CPF / CNPJ",
    valor: "Valor",
    data_inicio: "Data de início",
    data_fim: "Data de término",
    endereco: "Endereço",
  };
  if (special[key]) return special[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Gera o número do contrato: PREFIXO-ANO-0001 (sequencial por empresa/ano). */
export async function nextContractNumber(
  companyId: string,
  prefix: string,
  year: number
): Promise<string> {
  const { db } = await import("@/server/db");
  const seq = await db.contractSequence.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, last: 1 },
    update: { last: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(seq.last).padStart(4, "0")}`;
}
