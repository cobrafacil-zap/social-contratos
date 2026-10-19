import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./src/server/password";

const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirstOrThrow();
  const owner = await db.user.findFirstOrThrow({ where: { companyId: company.id } });

  const testUser = await db.user.upsert({
    where: { email: "teste.local@socialsign.dev" },
    update: {},
    create: {
      companyId: company.id,
      name: "Usuário de Teste",
      email: "teste.local@socialsign.dev",
      passwordHash: await hashPassword("SenhaDeTeste123!"),
      role: "ADMIN",
      permissions: [],
    },
  });

  const client = await db.client.create({
    data: {
      companyId: company.id,
      name: "Cliente Exemplo Ltda",
      document: "12.345.678/0001-90",
      email: "cliente@exemplo.com",
      createdBy: owner.id,
    },
  });

  const contract = await db.contract.create({
    data: {
      companyId: company.id,
      number: "SOC-2026-9001",
      title: "Contrato de Prestação de Serviços",
      clientId: client.id,
      ownerId: owner.id,
      createdBy: owner.id,
      status: "SIGNED",
      variables: {},
    },
  });

  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: {},
      renderedHtml: "<p>Contrato de teste</p>",
      createdBy: owner.id,
      sha256: "a".repeat(64),
    },
  });

  const signer = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: "Maria Souza",
      email: "maria@exemplo.com",
      role: "Sócia",
      order: 1,
      status: "SIGNED",
      tokenHash: `test-token-${Date.now()}`,
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
      viewedAt: new Date(),
      signedAt: new Date(),
    },
  });

  const fieldNome = await db.signatureField.create({
    data: {
      versionId: version.id,
      signerId: signer.id,
      type: "FULL_NAME",
      page: 1,
      x: 10,
      y: 20,
      width: 200,
      height: 30,
      required: true,
      label: "Nome completo",
      value: "Maria Souza",
    },
  });

  const fieldAssinatura = await db.signatureField.create({
    data: {
      versionId: version.id,
      signerId: signer.id,
      type: "SIGNATURE",
      page: 2,
      x: 10,
      y: 40,
      width: 220,
      height: 60,
      required: true,
      label: "Assinatura",
      value: "Maria Souza",
    },
  });

  const fieldCpf = await db.signatureField.create({
    data: {
      versionId: version.id,
      signerId: signer.id,
      type: "CPF",
      page: 1,
      x: 10,
      y: 60,
      width: 200,
      height: 30,
      required: false,
      label: "CPF",
      value: "123.456.789-00",
    },
  });

  await db.signature.create({
    data: {
      signerId: signer.id,
      fieldId: fieldAssinatura.id,
      method: "TYPED",
      typedName: "Maria Souza",
      fontStyle: "serif",
      documentSha256: "b".repeat(64),
      termsAcceptedAt: new Date(),
      signedAt: new Date(),
      ip: "189.45.22.10",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      uniqueCode: "ABC123XYZ",
    },
  });

  await db.signature.create({
    data: {
      signerId: signer.id,
      fieldId: fieldNome.id,
      method: "DRAWN",
      imageKey: "data:image/png;base64,AAAA",
      documentSha256: "b".repeat(64),
      termsAcceptedAt: new Date(),
      signedAt: new Date(),
      ip: "189.45.22.10",
      userAgent: "Mozilla/5.0 (iPhone)",
      uniqueCode: "DEF456UVW",
    },
  });

  const signer2 = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: "João Recusado",
      email: "joao@exemplo.com",
      role: "Cliente",
      order: 2,
      status: "REFUSED",
      tokenHash: `test-token-2-${Date.now()}`,
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
      refusedAt: new Date(),
      refusalReason: "Os valores não conferem.",
    },
  });

  await db.signature.create({
    data: {
      signerId: signer2.id,
      fieldId: fieldCpf.id,
      method: "UPLOADED",
      imageKey: "uploads/assinatura.png",
      documentSha256: "c".repeat(64),
      termsAcceptedAt: new Date(),
      signedAt: new Date(),
      ip: "200.10.0.5",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      uniqueCode: "GHI789RST",
    },
  });

  await db.notification.create({
    data: {
      companyId: company.id,
      userId: null,
      type: "CONTRACT_SIGNED",
      title: "Maria Souza assinou o contrato SOC-2026-9001",
      body: "Todos os signatários concluíram. O contrato está assinado.",
      contractId: contract.id,
    },
  });

  await db.notification.create({
    data: {
      companyId: company.id,
      userId: testUser.id,
      type: "CONTRACT_REFUSED",
      title: "João Recusado recusou assinar o contrato SOC-2026-9001",
      body: "Os valores não conferem.",
      contractId: contract.id,
    },
  });

  await db.notification.create({
    data: {
      companyId: company.id,
      userId: testUser.id,
      type: "CONTRACT_SENT",
      title: "Contrato enviado para assinatura",
      body: "O link foi enviado por e-mail.",
      contractId: contract.id,
      readAt: new Date(),
    },
  });

  console.log("dados de teste criados", { userId: testUser.id, contractId: contract.id, signatureId: (await db.signature.findFirstOrThrow({ orderBy: { signedAt: "asc" } })).id });
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
