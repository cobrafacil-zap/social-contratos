import { renderTemplate } from "@/lib/contract";
import type { CompanyOption } from "./shared";

/* -------------------------------------------------------------------------- */
/* Construção do HTML do contrato (somente no servidor)                      */
/* -------------------------------------------------------------------------- */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Extrai o HTML do corpo de um modelo (ContractTemplate.content). */
export function getTemplateHtml(content: unknown): string {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const html = (content as { html?: unknown }).html;
    if (typeof html === "string") return html;
  }
  return "";
}

function defaultHeader(company: CompanyOption, number: string): string {
  const lines: string[] = [];
  lines.push(
    `<strong style="color:#10131A;font-size:15px">${escapeHtml(company.legalName || company.name)}</strong>`
  );
  if (company.cnpj) lines.push(`CNPJ: ${escapeHtml(company.cnpj)}`);
  if (company.address) lines.push(escapeHtml(company.address));
  const contact = [company.phone, company.email].filter(Boolean).join(" · ");
  if (contact) lines.push(escapeHtml(contact));
  lines.push(`Contrato nº ${escapeHtml(number)}`);
  return `<div style="border-bottom:1px solid #E4E7EC;padding-bottom:12px;margin-bottom:24px;font-size:13px;color:#3B4252;line-height:1.6">${lines.join("<br/>")}</div>`;
}

function defaultFooter(company: CompanyOption): string {
  const parts = [company.name];
  if (company.responsibleName) parts.push(company.responsibleName);
  return `<div style="border-top:1px solid #E4E7EC;padding-top:12px;margin-top:28px;font-size:12px;color:#6B7385">${escapeHtml(parts.join(" · "))}</div>`;
}

function defaultBody(opts: {
  title: string;
  number: string;
  clientName: string;
  company: CompanyOption;
  variables: Record<string, string>;
}): string {
  const empresa = opts.company.legalName || opts.company.name;
  const valor = opts.variables.valor;
  const inicio = opts.variables.data_inicio;
  const fim = opts.variables.data_fim;
  return [
    `<h1 style="font-size:22px;font-weight:800;color:#10131A;margin:0 0 16px">${escapeHtml(opts.title)}</h1>`,
    `<p style="margin:0 0 12px;line-height:1.7">Pelo presente instrumento particular, <strong>${escapeHtml(empresa)}</strong>, doravante denominada <strong>CONTRATANTE</strong>, e <strong>${escapeHtml(opts.clientName)}</strong>, doravante denominado <strong>CONTRATADA</strong>, resolvem celebrar as cláusulas a seguir.</p>`,
    `<h2 style="font-size:16px;font-weight:700;color:#10131A;margin:20px 0 8px">1. Objeto</h2>`,
    `<p style="margin:0 0 12px;line-height:1.7">Este instrumento tem por objeto a prestação dos serviços descritos no escopo acordado entre as partes.</p>`,
    `<h2 style="font-size:16px;font-weight:700;color:#10131A;margin:20px 0 8px">2. Valor e vigência</h2>`,
    `<ul style="margin:0 0 12px;padding-left:20px;line-height:1.7">`,
    `<li>Valor: <strong>${escapeHtml(valor || "—")}</strong></li>`,
    `<li>Início: <strong>${escapeHtml(inicio || "—")}</strong></li>`,
    `<li>Término: <strong>${escapeHtml(fim || "—")}</strong></li>`,
    `</ul>`,
    `<h2 style="font-size:16px;font-weight:700;color:#10131A;margin:20px 0 8px">3. Assinaturas</h2>`,
    `<p style="margin:0 0 24px;line-height:1.7">E por estarem justos e contratos, firmam o presente instrumento em via eletrônica, na forma do contrato nº ${escapeHtml(opts.number)}.</p>`,
  ].join("");
}

/**
 * Monta o HTML final do contrato: cabeçalho + corpo renderizado + rodapé.
 * Os valores das variáveis são escapados para evitar injeção de HTML.
 */
export function buildContractHtml(opts: {
  company: CompanyOption;
  title: string;
  number: string;
  clientName: string;
  variables: Record<string, string>;
  templateHtml?: string | null;
  headerHtml?: string | null;
  footerHtml?: string | null;
}): string {
  const safeVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(opts.variables)) {
    safeVars[key] = typeof value === "string" ? escapeHtml(value) : "";
  }

  const body = opts.templateHtml?.trim()
    ? opts.templateHtml
    : defaultBody({
        title: opts.title,
        number: opts.number,
        clientName: opts.clientName,
        company: opts.company,
        variables: safeVars,
      });

  const header = opts.headerHtml?.trim()
    ? renderTemplate(opts.headerHtml, safeVars)
    : defaultHeader(opts.company, opts.number);

  const footer = opts.footerHtml?.trim()
    ? renderTemplate(opts.footerHtml, safeVars)
    : defaultFooter(opts.company);

  return [header, renderTemplate(body, safeVars), footer].join("\n");
}
