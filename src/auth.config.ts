import type { NextAuthConfig } from "next-auth";
import { encode, type JWTEncodeParams } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

// Rotas públicas: assinatura do cliente (por token), verificação, páginas legais, webhooks e cron.
export const PUBLIC = ["/login", "/cadastro", "/s/", "/verificar/", "/privacidade", "/termos", "/api/public/", "/api/webhooks/", "/api/cron/", "/api/auth"];

/** Sessão padrão (sem "manter conectado"): 8 horas. */
export const SESSION_MAX_AGE = 60 * 60 * 8;
/** Com "manter conectado": 30 dias. */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export const authConfig = {
  pages: { signIn: "/login" },
  // O cookie vive 30 dias (limite máximo). O token JWT é que expira em 8 h
  // quando o usuário não marca "manter conectado" — ver o encode customizado.
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },
  providers: [],
  jwt: {
    maxAge: REMEMBER_MAX_AGE,
    // Define a validade do token conforme a escolha feita no login.
    async encode({ token, secret, salt }: JWTEncodeParams<JWT>) {
      const remember = Boolean(token?.remember);
      return encode({
        token: token ?? {},
        secret,
        salt,
        maxAge: remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE,
      });
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (PUBLIC.some((p) => path === p || path.startsWith(p))) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        // "Manter conectado" escolhido no login
        token.remember = Boolean((user as { remember?: boolean }).remember);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as string;
      session.user.companyId = token.companyId as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
