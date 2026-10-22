import type { NextAuthConfig } from "next-auth";

// Rotas públicas: assinatura do cliente (por token), verificação, páginas legais, webhooks e cron.
export const PUBLIC = [
  "/login",
  "/cadastro",
  "/s/",
  "/verificar/",
  "/privacidade",
  "/termos",
  "/api/public/",
  "/api/webhooks/",
  "/api/cron/",
  "/api/unsubscribe",
  "/api/auth",
];

/** Sessão padrão (sem "manter conectado"): 8 horas. */
export const SESSION_MAX_AGE = 60 * 60 * 8;
/** Com "manter conectado": 30 dias. */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export const authConfig = {
  pages: { signIn: "/login" },
  // O cookie e o token vivem 30 dias (limite máximo). Sessões sem "manter
  // conectado" expiram em 8 h — isso é aplicado no callback `session`, que
  // devolve `null` quando a sessão já passou do prazo.
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },
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
        // "Manter conectado" escolhido no login
        token.remember = Boolean((user as { remember?: boolean }).remember);
        // Momento em que a sessão de 8 h começa a contar (para quem não marcou
        // "manter conectado"). Quem marcou recebe 30 dias.
        token.shortLivedAt = token.remember ? 0 : Math.floor(Date.now() / 1000);
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
