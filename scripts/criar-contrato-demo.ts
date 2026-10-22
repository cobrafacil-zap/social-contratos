/**
 * Cria um contrato de demonstração na empresa informada, com o mesmo HTML do
 * app, e envia o link de assinatura por e-mail. Os dados ficam no banco.
 *
 * Uso: npx tsx scripts/criar-contrato-demo.ts <emailDaEmpresa> <emailDoCliente> <nomeDoCliente>
 */
import { readFileSync } from "fs";
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

import { db } from "../src/server/db";
import { buildContractHtml } from "../src/app/(app)/contratos/html";
import { createSignerFields } from "../src/lib/signature-fields";
import { hashToken, randomToken, sha256 } from "../src/lib/contract";
import { sendEmail, signatureRequestEmail } from "../src/lib/email";

const [, , companyEmail, clientEmail, clientName] = process.argv;

async function main() {
  const user = await db.user.findUnique({ where: { email: companyEmail } });
  if (!user) throw new Error("Usuário não encontrado: " + companyEmail);
  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const companyId = company.id;

  // Cofre padrão
  let vault = await db.vault.findFirst({ where: { companyId, isDefault: true } });
  if (!vault) {
    vault = await db.vault.create({
      data: { companyId, name: "Cofre principal", description: "Cofre padrão da empresa", isDefault: true },
    });
  }

  // Cliente (reaproveita pelo e-mail)
  let client = await db.client.findFirst({ where: { companyId, email: clientEmail } });
  if (!client) {
    client = await db.client.create({
      data: { companyId, name: clientName, email: clientEmail, createdBy: user.id },
    });
  }

  // Número sequencial
  const year = new Date().getFullYear();
  const seq = await db.contractSequence.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, last: 1 },
    update: { last: { increment: 1 } },
  });
  const number = `${company.contractPrefix}-${year}-${String(seq.last).padStart(4, "0")}`;

  const variables = {
    empresa_nome: company.name,
    cliente_nome: client.name,
    cliente_documento: client.document ?? "",
    cliente_endereco: client.address ?? "",
    valor: "R$ 2.500,00",
    data_inicio: "01/11/2026",
    data_fim: "31/10/2027",
    objeto: "prestação de serviços de consultoria",
  };

  const html = buildContractHtml({
    company: {
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      phone: company.phone,
      email: company.email,
      cnpj: company.cnpj,
      responsibleName: company.responsibleName,
    },
    title: "Contrato de Prestação de Serviços",
    number,
    clientName: client.name,
    variables,
    templateHtml: null,
    headerHtml: null,
    footerHtml: null,
  });

  const contract = await db.contract.create({
    data: {
      companyId,
      number,
      title: "Contrato de Prestação de Serviços",
      clientId: client.id,
      vaultId: vault.id,
      ownerId: user.id,
      createdBy: user.id,
      status: "DRAFT",
      value: "2500.00",
      variables,
    },
  });

  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: { html, signers: [{ name: client.name, email: client.email, role: "Contratante" }] },
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: user.id,
    },
  });
  await db.contract.update({ where: { id: contract.id }, data: { currentVersionId: version.id } });

  // Signatário + link
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const signer = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: client.name,
      email: client.email,
      role: "Contratante",
      order: 1,
      status: "PENDING",
      tokenHash: hashToken(token),
      tokenExpiresAt: expiresAt,
    },
  });
  await createSignerFields(version.id, signer.id, "Contratante");
  await db.contractVersion.update({ where: { id: version.id }, data: { isLocked: true, lockedAt: new Date() } });
  await db.contract.update({ where: { id: contract.id }, data: { status: "SENT", sentAt: new Date() } });
  await db.activityLog.create({
    data: { companyId, userId: user.id, action: "CONTRACT_SENT", entity: "Contract", entityId: contract.id },
  });

  const url = `https://social-contratos.vercel.app/s/${token}`;
  const mail = signatureRequestEmail({
    companyName: company.name,
    contractTitle: "Contrato de Prestação de Serviços",
    contractNumber: number,
    signerName: client.name,
    signerEmail: client.email,
    role: "Contratante",
    signUrl: url,
    expiresAt,
  });
  const sent = await sendEmail({ to: client.email, subject: mail.subject, html: mail.html, text: mail.text });

  console.log("contrato:", number, "| status: SENT");
  console.log("link:", url);
  console.log("email:", sent.ok ? "ENVIADO" : "FALHOU: " + sent.error);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
