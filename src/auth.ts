import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

// Hash falso para igualar o tempo de resposta quando o e-mail não existe.
const DUMMY = "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Zm9vYmFyZm9vYmFyZm9vYmFyZm9vYmFyZm9vYmFy";

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
        const ok = await verify(user?.passwordHash ?? DUMMY, parsed.data.password).catch(() => false);
        if (!user || !ok || !user.isActive || user.deletedAt) return null;

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await db.activityLog.create({
          data: { companyId: user.companyId, userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
        });
        return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId };
      },
    }),
  ],
});
