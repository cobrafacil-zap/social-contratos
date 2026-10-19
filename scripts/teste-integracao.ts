import { PrismaClient } from "@prisma/client";
import { createHash, createHmac, randomBytes } from "crypto";

const url = (process.env.DATABASE_URL ?? "").includes("connection_limit=")
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}?connection_limit=1`;

const db = new PrismaClient({ datasources: { db: { url } } });

function hashToken(token: string) {
  const pepper = process.env.TOKEN_PEPPER || "dev-pepper";
  return createHmac("sha256", pepper).update(token).digest("hex");
}
function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  const stamp = Date.now();
  const email = `teste-${stamp}@exemplo.com`;

  // 1. Empresa + usuário
  const company = await db.company.create({
    data: {
      name: `Empresa Teste ${stamp}`,
      users: { create: { name: "Admin Teste", email, passwordHash: "x", role: "ADMIN" } },
    },
    include: { users: true },
  });
  const user = company.users[0];
  console.log("1. empresa + admin:", company.name, "/", email);

  // 2. Cofre
  const vault = await db.vault.create({
    data: { companyId: company.id, name: "Cofre principal", isDefault: true },
  });
  console.log("2. cofre:", vault.id);

  // 3. Cliente
  const client = await db.client.create({
    data: {
      companyId: company.id,
      name: "Cliente Exemplo",
      document: "12345678901",
      email: "cliente@exemplo.com",
      phone: "11988887777",
      address: "Rua das Flores, 100",
      city: "São Paulo",
      state: "SP",
      zip: "01001000",
      createdBy: user.id,
    },
  });
  console.log("3. cliente:", client.name);

  // 4. Modelo com variáveis
  const html = `<h1>Contrato de {{cliente_nome}}</h1><p>Entre {{empresa_nome}} e {{cliente_nome}}, valor {{valor}}.</p>`;
  const template = await db.contractTemplate.create({
    data: {
      companyId: company.id,
      name: "Prestação de Serviços",
      category: "Serviços",
      content: { html },
      createdBy: user.id,
    },
  });
  console.log("4. modelo:", template.name);

  // 5. Contrato + versão
  const number = `TEST-${new Date().getFullYear()}-${stamp % 10000}`;
  const contract = await db.contract.create({
    data: {
      companyId: company.id,
      number,
      title: "Contrato de Prestação de Serviços",
      clientId: client.id,
      templateId: template.id,
      vaultId: vault.id,
      ownerId: user.id,
      createdBy: user.id,
      status: "DRAFT",
      value: "1500.00",
      variables: { cliente_nome: "Cliente Exemplo", empresa_nome: company.name, valor: "R$ 1.500,00" },
    },
  });
  const rendered = html
    .replace(/\{\{\s*cliente_nome\s*\}\}/g, "Cliente Exemplo")
    .replace(/\{\{\s*empresa_nome\s*\}\}/g, company.name)
    .replace(/\{\{\s*valor\s*\}\}/g, "R$ 1.500,00");
  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: { html: rendered },
      renderedHtml: rendered,
      sha256: sha256(rendered),
      createdBy: user.id,
    },
  });
  await db.contract.update({ where: { id: contract.id }, data: { currentVersionId: version.id } });
  console.log("5. contrato + versão:", number);

  // 6. Enviar para assinatura: signatário + campos
  const token = randomBytes(32).toString("base64url");
  const signer = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: "Fulano de Tal",
      email: "fulano@exemplo.com",
      role: "Contratante",
      order: 1,
      status: "PENDING",
      tokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  const fields = await db.signatureField.createMany({
    data: [
      { versionId: version.id, signerId: signer.id, type: "FULL_NAME", label: "Nome completo", required: true, page: 1, x: 80, y: 620, width: 260, height: 20 },
      { versionId: version.id, signerId: signer.id, type: "CPF", label: "CPF", required: false, page: 1, x: 80, y: 650, width: 180, height: 20 },
      { versionId: version.id, signerId: signer.id, type: "DATE", label: "Data", required: true, page: 1, x: 280, y: 650, width: 140, height: 20 },
      { versionId: version.id, signerId: signer.id, type: "SIGNATURE", label: "Assinatura", required: true, page: 1, x: 80, y: 690, width: 240, height: 60 },
    ],
  });
  await db.contractVersion.update({ where: { id: version.id }, data: { isLocked: true, lockedAt: new Date() } });
  await db.contract.update({ where: { id: contract.id }, data: { status: "SENT", sentAt: new Date() } });
  console.log("6. signatário + campos:", fields.count, "campos | token:", token.slice(0, 12) + "...");

  // 7. Assinar
  const signerFields = await db.signatureField.findMany({ where: { signerId: signer.id } });
  for (const f of signerFields) {
    const isSig = f.type === "SIGNATURE";
    await db.signature.create({
      data: {
        signerId: signer.id,
        fieldId: f.id,
        method: isSig ? "TYPED" : "TYPED",
        typedName: isSig ? "Fulano de Tal" : null,
        documentSha256: sha256(rendered),
        termsAcceptedAt: new Date(),
        signedAt: new Date(),
        ip: "127.0.0.1",
        userAgent: "teste-integracao",
        uniqueCode: randomBytes(8).toString("hex").toUpperCase(),
      },
    });
  }
  await db.signer.update({ where: { id: signer.id }, data: { status: "SIGNED", signedAt: new Date() } });
  const pending = await db.signer.count({ where: { contractId: contract.id, status: { not: "SIGNED" } } });
  await db.contract.update({
    where: { id: contract.id },
    data: pending === 0 ? { status: "SIGNED", completedAt: new Date() } : { status: "PARTIALLY_SIGNED" },
  });
  console.log("7. assinatura registrada | status final:", pending === 0 ? "SIGNED" : "PARTIALLY_SIGNED");

  // 8. Verificações
  const finalStatus = await db.contract.findUnique({ where: { id: contract.id }, select: { status: true, completedAt: true } });
  const sigCount = await db.signature.count({ where: { signerId: signer.id } });
  const notif = await db.notification.count({ where: { companyId: company.id } });
  console.log("8. verificações → status:", finalStatus?.status, "| assinaturas:", sigCount, "| notificações:", notif);

  // Limpeza
  await db.signature.deleteMany({ where: { signerId: signer.id } });
  await db.signatureField.deleteMany({ where: { signerId: signer.id } });
  await db.signer.delete({ where: { id: signer.id } });
  await db.contractVersion.delete({ where: { id: version.id } });
  await db.contract.delete({ where: { id: contract.id } });
  await db.contractTemplate.delete({ where: { id: template.id } });
  await db.client.delete({ where: { id: client.id } });
  await db.vault.delete({ where: { id: vault.id } });
  await db.user.delete({ where: { id: user.id } });
  await db.company.delete({ where: { id: company.id } });
  console.log("9. limpeza concluída");
}

main()
  .catch((e) => {
    console.error("FALHOU:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
