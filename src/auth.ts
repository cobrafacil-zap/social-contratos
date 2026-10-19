import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/server/password";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
});

// Hash falso (formato scrypt salt:hash) para igualar o tempo de resposta quando o e-mail não existe.
const DUMMY_SALT = "0000000000000000";
const DUMMY_HASH = "0".repeat(128);
const DUMMY = `${DUMMY_SALT}:${DUMMY_HASH}`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.trim().toLowerCase();

        // 5 tentativas / 15 min por e-mail
        if (!rateLimit(`login:${email}`, 5, 15 * 60_000)) return null;

        const user = await db.user.findUnique({ where: { email } });
        const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY).catch(() => false);
        if (!user || !ok || !user.isActive || user.deletedAt) return null;

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await db.activityLog.create({
          data: { companyId: user.companyId, userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          remember: Boolean(parsed.data.remember),
        };
      },
    }),
  ],
});
