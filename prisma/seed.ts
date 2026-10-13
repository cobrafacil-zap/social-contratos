import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve ter ao menos 12 caracteres");

  if (await db.user.findUnique({ where: { email } })) {
    console.log("Administrador já existe. Nada a fazer.");
    return;
  }
  const company = await db.company.create({ data: { name: process.env.SEED_COMPANY_NAME || "Minha Empresa" } });
  await db.user.create({
    data: {
      companyId: company.id,
      name: process.env.SEED_ADMIN_NAME || "Administrador",
      email,
      role: "ADMIN",
      passwordHash: await hash(password, 12), // bcrypt
    },
  });
  console.log(`Empresa e administrador criados: ${email}`);
}

main().finally(() => db.$disconnect());
