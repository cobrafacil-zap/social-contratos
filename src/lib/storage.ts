import { createHash } from "crypto";

/** Mensagem exibida quando o Supabase Storage não está configurado no ambiente. */
export const STORAGE_NOT_CONFIGURED_MESSAGE =
  "Storage não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY";

/** Tamanho máximo aceito para upload de documentos (15 MB). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type StorageConfig = {
  url: string;
  serviceKey: string;
  bucket: string;
};

/** Indica se as variáveis de ambiente do Storage estão presentes. */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Lê a configuração do Storage ou lança um erro claro. */
function storageConfig(): StorageConfig {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(STORAGE_NOT_CONFIGURED_MESSAGE);
  }
  return {
    url: url.replace(/\/+$/, ""),
    serviceKey,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "contracts",
  };
}

/** Mantém as "/" do caminho e escapa cada segmento individualmente. */
function encodeStoragePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Sanitiza o nome do arquivo mantendo apenas letras, números, ponto, hífen e
 * underscore (com acentos normalizados).
 */
export function slugifyFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").trim();
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/[-.]+$/, "")
    .slice(0, 120);
  return slug || "arquivo";
}

/**
 * Envia um arquivo para o Supabase Storage usando a REST API.
 * Retorna a chave do objeto e o hash SHA-256 do conteúdo.
 */
export async function uploadToStorage(
  file: File,
  folder: string,
): Promise<{ key: string; sha256: string }> {
  const { url, serviceKey, bucket } = storageConfig();
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "") || "uploads";
  const key = `${cleanFolder}/${Date.now()}-${slugifyFileName(file.name)}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodeStoragePath(key)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: new Uint8Array(buffer),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Falha ao enviar o arquivo para o Storage (HTTP ${response.status})${
        detail ? `: ${detail.slice(0, 200)}` : ""
      }`,
    );
  }

  return { key, sha256 };
}

/**
 * Gera uma URL assinada temporária para download de um objeto do Storage.
 * A URL válida por `expiresIn` segundos (padrão: 60).
 */
export async function createSignedUrl(
  key: string,
  expiresIn = 60,
): Promise<string> {
  const { url, serviceKey, bucket } = storageConfig();

  const response = await fetch(
    `${url}/storage/v1/object/sign/${bucket}/${encodeStoragePath(key)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Falha ao gerar o link de download (HTTP ${response.status})${
        detail ? `: ${detail.slice(0, 200)}` : ""
      }`,
    );
  }

  const data = (await response.json()) as { signedURL?: string };
  if (!data.signedURL) {
    throw new Error("O Storage não retornou uma URL assinada para o documento.");
  }

  return `${url}${data.signedURL}`;
}
