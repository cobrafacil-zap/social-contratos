/**
 * Cria o modelo de contrato "SM Company" e o cofre homônimo na empresa SM,
 * a partir do PDF "Contrato_SM_Company_Atualizado".
 *
 * Uso: npx tsx scripts/criar-modelo-sm-company.ts
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

const COMPANY_EMAIL = process.env.SM_COMPANY_EMAIL || "contatocomercialsocial@gmail.com";

const TEMPLATE_NAME = "SM Company";
const VAULT_NAME = "SM Company";

const TPL = `<h1 style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-0.02em;text-align:center;text-transform:uppercase;">Termo de Compromisso e Confidencialidade</h1>
<p style="margin:0 0 24px;text-align:center;font-size:13px;font-weight:600;color:#6B7385;text-transform:uppercase;letter-spacing:0.08em;">Assessoria em Marketing Digital</p>

<p style="margin:0 0 16px;line-height:1.7;">Pelo presente instrumento particular, de um lado <strong>{{empresa_nome}}</strong>, doravante denominada “Assessoria”, e de outro, <strong>{{cliente_razao_social}}</strong>, inscrita no CNPJ sob o nº {{cliente_documento}}, doravante denominada “Contratante”, têm entre si justo e acordado o seguinte:</p>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">1. Objeto do Termo</h2>
<p style="margin:0 0 12px;line-height:1.7;">Este termo tem como objeto a prestação de serviços de assessoria em marketing digital, com foco em tráfego pago, voltada para negócios de achadinhos.</p>
<p style="margin:0 0 8px;line-height:1.7;">A assessoria inclui:</p>
<ul style="margin:0 0 12px;padding-left:22px;line-height:1.7;">
<li>Acompanhamento completo durante o período de {{prazo_dias}} dias.</li>
<li>Planejamento, execução e otimização de campanhas de tráfego pago;</li>
<li>Acesso e uso de plataformas e ferramentas que contribuem com a melhoria de desempenho das campanhas;</li>
<li>Administração das contas de anúncios do contratante;</li>
<li>Suporte estratégico e técnico relacionado às campanhas ativas.</li>
</ul>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">2. Valor e Condições de Pagamento</h2>
<p style="margin:0 0 12px;line-height:1.7;">O valor total da assessoria é de <strong>{{valor}}</strong> ({{valor_extenso}}), podendo ser pago:</p>
<ul style="margin:0 0 12px;padding-left:22px;line-height:1.7;">
<li>À vista, via transferência bancária/Pix;</li>
<li>Ou parcelado, com acréscimo da taxa de operação das maquininhas/cartões.</li>
</ul>
<p style="margin:0 0 12px;line-height:1.7;">O valor contratado e os valores eventualmente já pagos não são reembolsáveis, considerando a reserva de agenda, disponibilização de estrutura, planejamento e execução dos serviços durante o período contratado.</p>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">3. Confidencialidade</h2>
<p style="margin:0 0 12px;line-height:1.7;">O contratante declara estar ciente de que todas as informações, estratégias, materiais, acessos e métodos repassados pela Assessoria são confidenciais e não poderão ser compartilhados com terceiros, sob nenhuma circunstância, seja durante ou após o término da assessoria.</p>
<p style="margin:0 0 12px;line-height:1.7;">O uso indevido dessas informações poderá resultar em medidas legais cabíveis.</p>
<p style="margin:0 0 12px;line-height:1.7;">O uso de dados e ativos digitais do CONTRATANTE, incluindo informações da BM, contas de anúncios, relatórios e campanhas, será estritamente limitado ao que for necessário para a prestação dos serviços contratados. Fica vedado à ASSESSORIA o uso desses dados para quaisquer outros fins, sob pena de responsabilização civil e criminal, inclusive nos termos da LGPD.</p>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">4. Acesso às Contas</h2>
<p style="margin:0 0 12px;line-height:1.7;">O CONTRATANTE declara estar ciente e de acordo que a equipe da ASSESSORIA terá acesso às suas contas de anúncios, Business Manager (BM) e demais plataformas envolvidas na operação de marketing digital, exclusivamente para fins de execução dos serviços contratados.</p>
<p style="margin:0 0 12px;line-height:1.7;">Fica expressamente reconhecido que a titularidade e a propriedade de todas as contas de anúncios, ativos digitais e Business Manager são e permanecerão sendo do CONTRATANTE, em total conformidade com os princípios da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), especialmente no que tange à autonomia, segurança e controle sobre dados pessoais e ativos digitais vinculados à sua identidade e atividade comercial.</p>
<p style="margin:0 0 12px;line-height:1.7;">A ASSESSORIA compromete-se a não transferir, replicar, copiar, exportar ou fazer qualquer uso indevido ou sem autorização expressa dos acessos fornecidos, bem como a respeitar os níveis de acesso estabelecidos pelo CONTRATANTE.</p>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">5. Prazo</h2>
<p style="margin:0 0 12px;line-height:1.7;">O presente termo tem vigência de {{prazo_dias}} dias a contar da data de assinatura.</p>

<h2 style="margin:22px 0 8px;font-size:15px;font-weight:800;">6. DA ADESÃO VOLUNTÁRIA</h2>
<p style="margin:0 0 12px;line-height:1.7;">O(A) CONTRATANTE declara, para todos os fins de direito, que aderiu ao programa de mentoria de forma totalmente voluntária, por iniciativa própria, sem qualquer coação, imposição, obrigação, promessa de resultado garantido ou abordagem direta por parte da CONTRATADA ou de seus representantes. Declara ainda que teve plena liberdade para analisar previamente as condições da mentoria, compreendendo seus objetivos, metodologia e responsabilidades assumidas, e que sua decisão de contratação foi tomada de maneira consciente e informada.</p>

<p style="margin:18px 0 12px;line-height:1.7;">E por estarem de acordo, as partes assinam o presente termo.</p>
<p style="margin:0 0 22px;line-height:1.7;">{{cidade}}, {{data_assinatura}}</p>

<table style="width:100%;border-collapse:collapse;margin-top:26px;">
<tr>
<td style="width:50%;padding:0 16px 0 0;vertical-align:top;border-top:1px solid #10131A;padding-top:8px;">
<p style="margin:0;font-size:13px;font-weight:700;">Assinatura do Contratante</p>
<p style="margin:4px 0 0;font-size:12px;color:#3B4252;">{{cliente_razao_social}}</p>
<p style="margin:2px 0 0;font-size:12px;color:#3B4252;">CNPJ: {{cliente_documento}}</p>
</td>
<td style="width:50%;padding:0 0 0 16px;vertical-align:top;border-top:1px solid #10131A;padding-top:8px;">
<p style="margin:0;font-size:13px;font-weight:700;">Assinatura da Assessoria</p>
<p style="margin:4px 0 0;font-size:12px;color:#3B4252;">{{empresa_nome}}</p>
<p style="margin:2px 0 0;font-size:12px;color:#3B4252;">CPF/CNPJ: {{empresa_cnpj}}</p>
</td>
</tr>
</table>`;

const VARIABLES = [
  "empresa_nome",
  "empresa_cnpj",
  "cliente_razao_social",
  "cliente_nome",
  "cliente_documento",
  "cliente_endereco",
  "cidade",
  "data_assinatura",
  "valor",
  "valor_extenso",
  "prazo_dias",
  "objeto",
];

async function main() {
  const user = await db.user.findUnique({ where: { email: COMPANY_EMAIL } });
  if (!user) throw new Error("Usuário não encontrado: " + COMPANY_EMAIL);
  const company = await db.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const companyId = company.id;

  /* --------------------------- 1. Modelo de contrato --------------------------- */
  let template = await db.contractTemplate.findFirst({
    where: { companyId, name: TEMPLATE_NAME, deletedAt: null },
  });
  if (template) {
    template = await db.contractTemplate.update({
      where: { id: template.id },
      data: { content: { html: TPL }, category: "Assessoria" },
    });
    console.log("modelo atualizado:", template.name);
  } else {
    template = await db.contractTemplate.create({
      data: {
        companyId,
        name: TEMPLATE_NAME,
        category: "Assessoria",
        content: { html: TPL },
        createdBy: user.id,
      },
    });
    console.log("modelo criado:", template.name);
  }

  /* ------------------------------- 2. Cofre SM ------------------------------- */
  let vault = await db.vault.findFirst({ where: { companyId, name: VAULT_NAME } });
  if (vault) {
    vault = await db.vault.update({
      where: { id: vault.id },
      data: { isDefault: true, description: "Contratos da SM Company" },
    });
  } else {
    vault = await db.vault.create({
      data: {
        companyId,
        name: VAULT_NAME,
        description: "Contratos e modelos da SM Company",
        isDefault: true,
      },
    });
  }
  // garante que é o único padrão
  await db.vault.updateMany({ where: { companyId, id: { not: vault.id } }, data: { isDefault: false } });
  console.log("cofre:", vault.name, "| padrão: sim");

  /* ------------------------- 3. Contrato de exemplo ------------------------- */
  const year = new Date().getFullYear();
  const seq = await db.contractSequence.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, last: 1 },
    update: { last: { increment: 1 } },
  });
  const number = `${company.contractPrefix}-${year}-${String(seq.last).padStart(4, "0")}`;

  const client = await db.client.findFirst({ where: { companyId, email: "contatocomercialsocial@gmail.com" } });
  const clientId = client
    ? client.id
    : (
        await db.client.create({
          data: {
            companyId,
            name: "CHEFINHA DOS ACHADINHOS LTDA",
            email: "contatocomercialsocial@gmail.com",
            document: "57.517.395/0001-11",
            companyName: "CHEFINHA DOS ACHADINHOS LTDA",
            createdBy: user.id,
          },
        })
      ).id;

  const variables = {
    empresa_nome: company.legalName || company.name,
    empresa_cnpj: company.cnpj || "61.622.196/0001-40",
    cliente_razao_social: "CHEFINHA DOS ACHADINHOS LTDA",
    cliente_nome: "CHEFINHA DOS ACHADINHOS LTDA",
    cliente_documento: "57.517.395/0001-11",
    cliente_endereco: "",
    cidade: "Cornélio Procópio",
    data_assinatura: "05/10/2026",
    valor: "R$ 4.000,00",
    valor_extenso: "quatro mil reais",
    prazo_dias: "90",
    objeto: "prestação de serviços de assessoria em marketing digital",
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
    title: "Termo de Compromisso e Confidencialidade — Assessoria em Marketing Digital",
    number,
    clientName: variables.cliente_razao_social,
    variables,
    templateHtml: TPL,
    headerHtml: null,
    footerHtml: null,
  });

  const contract = await db.contract.create({
    data: {
      companyId,
      number,
      title: "Termo de Compromisso e Confidencialidade — Assessoria em Marketing Digital",
      clientId,
      templateId: template.id,
      vaultId: vault.id,
      ownerId: user.id,
      createdBy: user.id,
      status: "DRAFT",
      value: "4000.00",
      variables,
    },
  });

  const version = await db.contractVersion.create({
    data: {
      contractId: contract.id,
      versionNumber: 1,
      content: {
        html,
        signers: [{ name: variables.cliente_razao_social, email: "contatocomercialsocial@gmail.com", role: "Contratante" }],
      },
      renderedHtml: html,
      sha256: sha256(html),
      createdBy: user.id,
    },
  });
  await db.contract.update({ where: { id: contract.id }, data: { currentVersionId: version.id } });

  // Signatário + envio do e-mail
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const signer = await db.signer.create({
    data: {
      contractId: contract.id,
      versionId: version.id,
      name: variables.cliente_razao_social,
      email: "contatocomercialsocial@gmail.com",
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
    contractTitle: "Termo de Compromisso e Confidencialidade — Assessoria em Marketing Digital",
    contractNumber: number,
    signerName: variables.cliente_razao_social,
    role: "Contratante",
    signUrl: url,
    expiresAt,
  });
  const sent = await sendEmail({
    to: "contatocomercialsocial@gmail.com",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  console.log("contrato:", number, "| cofre:", vault.name, "| modelo:", template.name);
  console.log("link:", url);
  console.log("email:", sent.ok ? "ENVIADO" : "FALHOU: " + sent.error);
  console.log("variaveis do modelo:", VARIABLES.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
