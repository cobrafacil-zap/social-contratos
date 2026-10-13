import "next-auth";
declare module "next-auth" {
  interface User { role: string; companyId: string }
  interface Session { user: { id: string; role: string; companyId: string; name?: string | null; email?: string | null } }
}
