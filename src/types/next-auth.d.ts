import "next-auth";
declare module "next-auth" {
  interface User {
    role: string;
    companyId: string;
    /** true quando o usuário marcou "manter conectado" no login. */
    remember?: boolean;
  }
  interface Session {
    user: { id: string; role: string; companyId: string; name?: string | null; email?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    companyId?: string;
    remember?: boolean;
  }
}
