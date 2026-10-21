import { PrismaClient } from "@prisma/client";

/**
 * O pooler do Supabase (free) aceita ~15 conexões por projeto no total e a
 * Vercel escala em várias instâncias. Por isso a string de conexão precisa de
 * `?connection_limit=1` (uma conexão por instância) e `?pgbouncer=true`
 * (sem prepared statements, compatível com pooler).
 *
 * O Prisma lê a DATABASE_URL do ambiente — não sobrescrevemos a URL para não
 * perder nenhum parâmetro de pool.
 */
const g = globalThis as unknown as { prisma?: PrismaClient };

export const db = g.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") g.prisma = db;
