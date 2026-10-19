import { PrismaClient } from "@prisma/client";

/**
 * O pooler do Supabase (free) aceita no máximo ~15 conexões por projeto e a
 * Vercel escala em várias instâncias. Limitar a 1 conexão por instância evita
 * o erro "max clients reached in session mode".
 */
function withSafePoolLimit(url: string | undefined): string | undefined {
  if (!url) return url;
  if (/connection_limit=/.test(url)) return url;
  return url.includes("?") ? `${url}&connection_limit=1` : `${url}?connection_limit=1`;
}

const g = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  g.prisma ??
  new PrismaClient({
    datasources: { db: { url: withSafePoolLimit(process.env.DATABASE_URL) } },
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
