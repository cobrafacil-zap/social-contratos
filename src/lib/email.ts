/**
 * Envio de e-mail via API REST do Resend (sem dependências extras).
 *
 * Configuração (variáveis de ambiente):
 *   RESEND_API_KEY  -> chave da API (resend.com)
 *   EMAIL_FROM      -> remetente, ex.: "Social Sign <contratos@seudominio.com>"
 *
 * Se as variáveis não estiverem definidas, `isEmailConfigured()` retorna false e
 * o app segue funcionando — o link de assinatura é exibido na tela para envio manual.
 */

export type EmailResult = { ok: boolean; error?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Social Sign <onboarding@resend.dev>";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  headers,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "E-mail não configurado: defina RESEND_API_KEY e EMAIL_FROM." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [to],
        subject,
        html,
        text: text ?? undefined,
        headers: headers ?? undefined,
        reply_to: (replyTo ?? process.env.EMAIL_REPLY_TO) || undefined,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Falha ao enviar e-mail (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido ao enviar e-mail." };
  }
}

/** E-mail com o link de assinatura do contrato. */
export function signatureRequestEmail({
  companyName,
  contractTitle,
  contractNumber,
  signerName,
  signerEmail,
  role,
  signUrl,
  expiresAt,
}: {
  companyName: string;
  contractTitle: string;
  contractNumber: string;
  signerName: string;
  signerEmail: string;
  role: string;
  signUrl: string;
  expiresAt: Date;
}) {
  const safeCompany = escapeHtml(companyName);
  const safeTitle = escapeHtml(contractTitle);
  const safeNumber = escapeHtml(contractNumber);
  const safeName = escapeHtml(signerName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(signUrl);
  const data = expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Assinatura do contrato ${safeNumber}</title>
</head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#10131A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;background:#10131A;color:#ffffff;">
            <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Social Sign</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${safeCompany}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Olá, ${safeName}!</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3B4252;">
              Você recebeu o documento <strong>${safeTitle}</strong> (${safeNumber}) para assinar na qualidade de <strong>${safeRole}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3B4252;">
              Clique no botão abaixo para revisar o documento e assinar. O link é individual e registra data, hora, IP e dispositivo.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3B4252;">
              Estamos muito felizes em ter você com a gente — assinando este documento, você passa a fazer parte da equipe
              da <strong>${safeCompany}</strong>. Qualquer dúvida, responda este e-mail.
            </p>
            <p style="margin:0 0 24px;">
              <a href="${safeUrl}" style="display:inline-block;background:#2F4BFF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 26px;border-radius:10px;">Revisar e assinar</a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#6B7385;line-height:1.6;">
              Se o botão não funcionar, copie e cole este endereço no navegador:<br>
              <span style="word-break:break-all;color:#2F4BFF;">${safeUrl}</span>
            </p>
            <p style="margin:0;font-size:13px;color:#6B7385;line-height:1.6;">
              Este link é válido até <strong>${data}</strong>. Se você não esperava esta solicitação, ignore este e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background:#F6F7F9;border-top:1px solid #E4E7EC;">
            <p style="margin:0;font-size:12px;color:#6B7385;line-height:1.5;">
              Enviado por ${safeCompany} via Social Sign. Cada assinatura registrada inclui documento, data, IP e dispositivo, servindo como comprovante legal.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${signerName}!

Você recebeu o documento "${contractTitle}" (${contractNumber}) para assinar na qualidade de ${role}.

Assine pelo link abaixo (válido até ${data}):
${signUrl}

Se você não esperava esta solicitação, ignore este e-mail.

--
${companyName} via Social Sign`;

  // Headers que ajudam o Gmail (e o Outlook) a entregar na caixa de entrada:
  // identificam o remetente legítimo e oferecem descadastro em um clique (RFC 8058).
  // O Gmail exige o par `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click`
  // com uma URL HTTPS para considerar o remetente "confiável" e não arquivar
  // automaticamente as mensagens em Promoções/Spam.
  const appUrl = (process.env.APP_URL || "https://social-contratos.vercel.app").replace(/\/$/, "");
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${appUrl}/api/unsubscribe?email=${encodeURIComponent(signerEmail)}>, <mailto:contatocomercialsocial@gmail.com?subject=Remover%20inscricao>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": `sm-contrato-${contractNumber}`,
  };

  return { subject: `Assinatura pendente: ${contractTitle} (${contractNumber})`, html, text, headers };
}

/* -------------------------------------------------------------------------- */
/* Página comum de e-mail (mesmo visual dos demais)                             */
/* -------------------------------------------------------------------------- */

function emailShell({
  company,
  title,
  intro,
  body,
  ctaLabel,
  ctaUrl,
  footer,
}: {
  company: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer: string;
}): string {
  const safeCompany = escapeHtml(company);
  const cta =
    ctaLabel && ctaUrl
      ? `<p style="margin:0 0 24px;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2F4BFF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 26px;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
         </p>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#10131A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;background:#10131A;color:#ffffff;">
            <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Social Sign</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${safeCompany}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(title)}</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3B4252;">${escapeHtml(intro)}</p>
            ${body}
            ${cta}
            <p style="margin:0;font-size:13px;color:#6B7385;line-height:1.6;">${escapeHtml(footer)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * E-mail de agradecimento ao cliente depois que ele assina.
 * Ele faz parte da equipe — por isso o tom de boas-vindas.
 */
export function signatureThankYouEmail({
  companyName,
  contractTitle,
  contractNumber,
  signerName,
  signUrl,
}: {
  companyName: string;
  contractTitle: string;
  contractNumber: string;
  signerName: string;
  signUrl: string;
}) {
  const firstName = signerName.trim().split(/\s+/)[0] || signerName;
  const html = emailShell({
    company: companyName,
    title: `Obrigado por fazer parte da equipe, ${firstName}!`,
    intro: `A assinatura do documento "${contractTitle}" (${contractNumber}) foi registrada com sucesso. Estamos muito felizes em ter você com a gente.`,
    body: `
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3B4252;">
              A partir de agora você faz parte da equipe da <strong>${escapeHtml(companyName)}</strong>.
              Qualquer dúvida, é só responder este e-mail — a nossa equipe está à disposição.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3B4252;">
              Guarde esta mensagem: o link abaixo mantém o documento assinado disponível para você
              consultar quando precisar.
            </p>`,
    ctaLabel: "Ver documento assinado",
    ctaUrl: signUrl,
    footer: "Uma cópia do documento, com data, hora, IP e dispositivo, ficou registrada como comprovante legal.",
  });

  const text = `Olá, ${firstName}!

Obrigado por fazer parte da equipe da ${companyName}!

A assinatura do documento "${contractTitle}" (${contractNumber}) foi registrada com sucesso.

Acesse o documento assinado:
${signUrl}

Uma cópia ficou registrada com data, hora, IP e dispositivo, servindo como comprovante legal.

--
${companyName} via Social Sign`;

  return {
    subject: `Obrigado por fazer parte da equipe, ${firstName}! (${contractNumber})`,
    html,
    text,
  };
}

/**
 * Aviso para a empresa de que o cliente acabou de assinar.
 * Vai para a caixa do administrador, para ele agir sem precisar entrar no sistema.
 */
export function signatureCompletedNoticeEmail({
  companyName,
  contractTitle,
  contractNumber,
  signerName,
  signerEmail,
  signedAt,
  allSigned,
  signUrl,
}: {
  companyName: string;
  contractTitle: string;
  contractNumber: string;
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  allSigned: boolean;
  signUrl: string;
}) {
  const quando = signedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = emailShell({
    company: companyName,
    title: allSigned
      ? `Contrato assinado: ${contractNumber}`
      : `Nova assinatura recebida: ${contractNumber}`,
    intro: `${signerName} acabou de assinar "${contractTitle}".`,
    body: `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;border:1px solid #E4E7EC;border-radius:10px;overflow:hidden;margin:0 0 24px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7385;">Signatário</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:700;">${escapeHtml(signerName)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7385;border-top:1px solid #E4E7EC;">E-mail</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:700;border-top:1px solid #E4E7EC;">${escapeHtml(signerEmail)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7385;border-top:1px solid #E4E7EC;">Data e hora</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:700;border-top:1px solid #E4E7EC;">${escapeHtml(quando)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7385;border-top:1px solid #E4E7EC;">Situação</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:700;border-top:1px solid #E4E7EC;">${
                  allSigned ? "Contrato concluído — todas as assinaturas coletadas" : "Ainda há signatários pendentes"
                }</td>
              </tr>
            </table>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3B4252;">
              O documento, a data, a hora, o IP e o dispositivo ficaram registrados como comprovante.
            </p>`,
    ctaLabel: "Ver contrato no painel",
    ctaUrl: signUrl,
    footer: "Este aviso foi enviado automaticamente pelo Social Sign.",
  });

  const text = `${signerName} assinou "${contractTitle}" (${contractNumber}).

Signatário: ${signerName} <${signerEmail}>
Data e hora: ${quando}
Situação: ${allSigned ? "Contrato concluído" : "Ainda há signatários pendentes"}

Ver contrato: ${signUrl}

--
Social Sign`;

  return {
    subject: allSigned
      ? `✅ Contrato assinado: ${contractNumber} — ${signerName}`
      : `Nova assinatura: ${contractNumber} — ${signerName}`,
    html,
    text,
  };
}
