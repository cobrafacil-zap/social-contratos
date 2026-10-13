"use server";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { signIn } from "@/auth";

export type SignupState = { error?: string };

const schema = z.object({
  companyName: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres").max(200),
});

export async function signupAction(_: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos e tente novamente." };
  }

  const { companyName, name, email, password } = parsed.data;

  // Rate limiting: 5 tentativas de cadastro por e-mail a cada 15 minutos
  if (!rateLimit(`signup:${email}`, 5, 15 * 60_000)) {
    return { error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." };
  }

  // Verifica se o e-mail já está em uso
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Este e-mail já está cadastrado. Tente fazer login." };
  }

  try {
    const passwordHash = await hash(password);

    // Cria empresa
    const company = await db.company.create({
      data: { name: companyName },
    });

    // Cria usuário admin
    const user = await db.user.create({
      data: {
        companyId: company.id,
        name,
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    // Log de atividade
    await db.activityLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "COMPANY_CREATED",
        entity: "Company",
        entityId: company.id,
        metadata: { email },
      },
    });

    // Login automático após cadastro
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch {
    return { error: "Erro ao criar conta. Verifique seus dados e tente novamente." };
  }

  return {};
}
