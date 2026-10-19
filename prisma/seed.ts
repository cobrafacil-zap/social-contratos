import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve ter ao menos 12 caracteres");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Administrador já existe. Nada a fazer.");
    return;
  }

  const company = await db.company.create({
    data: { name: process.env.SEED_COMPANY_NAME || "Minha Empresa" },
  });

  await db.user.create({
    data: {
      companyId: company.id,
      name: process.env.SEED_ADMIN_NAME || "Administrador",
      email,
      role: "ADMIN",
      // Mesmo algoritmo usado no login (scrypt) — ver src/server/password.ts
      passwordHash: await hashPassword(password),
    },
  });

  console.log(`Empresa e administrador criados: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
