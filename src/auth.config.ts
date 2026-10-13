import type { NextAuthConfig } from "next-auth";

// Rotas públicas: assinatura do cliente (por token), verificação, páginas legais, webhooks e cron.
export const PUBLIC = ["/login", "/s/", "/verificar/", "/privacidade", "/termos", "/api/public/", "/api/webhooks/", "/api/cron/", "/api/auth"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [],
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
