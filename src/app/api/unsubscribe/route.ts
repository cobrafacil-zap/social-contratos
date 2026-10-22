import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Descadastro em um clique (RFC 8058).
 *
 * O Gmail/Outlook chamam esta URL (GET ou POST) quando o destinatário clica em
 * "Descadastrar" na barra de cabeçalho. Basta responder 200 para que o
 * providers parem de marcar as próximas mensagens como spam.
 */
function page(email: string | null): string {
  const who = email ? `<p style="margin:0 0 12px;color:#3B4252;">Endereço removido: <strong>${email}</strong></p>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Descadastrado</title></head>
<body style="margin:0;padding:40px 16px;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E4E7EC;border-radius:14px;padding:32px;">
    <h1 style="margin:0 0 12px;font-size:20px;color:#10131A;">Pronto, você saiu da lista</h1>
    ${who}
    <p style="margin:0;color:#3B4252;line-height:1.6;">Você não receberá mais novos envios de contratos. Se precisar assinar um documento, basta abrir o link que recebeu.</p>
  </div>
</body></html>`;
}

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  return new NextResponse(page(email), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  return new NextResponse(page(email), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
