import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";

export type Session = {
  userId: string;
  companyId: string;
  role: string;
  name: string;
  email: string;
};

/** Retorna a sessão do usuário logado ou redireciona para /login. */
export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user;
  return {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    name: user.name ?? "",
    email: user.email ?? "",
  };
}

/** Igual a requireUser, mas retorna null em vez de redirecionar. */
export async function getUser(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = session.user;
  return {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    name: user.name ?? "",
    email: user.email ?? "",
  };
}

/** Carrega o usuário direto do banco, validando se ainda está ativo. */
export async function loadActiveUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, companyId: true, isActive: true, deletedAt: true },
  });
}
