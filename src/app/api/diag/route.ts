import { NextResponse } from "next/server";
import { createAndSendContractAction } from "../../(app)/contratos/actions";

export const dynamic = "force-dynamic";

export async function POST() {
  const { auth } = await import("@/auth");
  const { cookies, headers } = await import("next/headers");
  const ck = await cookies();
  const hd = await headers();
  const sess = await auth();

  const fd = new FormData();
  fd.set("clientName", "Cliente Diagnostico");
  fd.set("clientEmail", "priscilasinopolis@gmail.com");
  fd.set("clientDocument", "");
  fd.set("clientAddress", "");
  fd.set("title", "Diagnostico");
  fd.set("templateId", "");
  fd.set("value", "500,00");
  fd.set("startDate", "");
  fd.set("endDate", "");
  fd.set("expiresInDays", "30");
  fd.set("signerName", "Cliente Diagnostico");
  fd.set("signerEmail", "priscilasinopolis@gmail.com");
  fd.set("vaultId", "");
  fd.set("newVaultName", "");

  try {
    const r = await createAndSendContractAction({}, fd);
    return NextResponse.json({
      ok: true,
      resultado: r,
      diagnostico: {
        session: sess?.user ?? null,
        cookies: ck.getAll().map((c) => ({ name: c.name, len: c.value.length })),
        headers: { host: hd.get("host"), proto: hd.get("x-forwarded-proto"), url: hd.get("x-forwarded-host") },
        env: { appUrl: process.env.APP_URL, temAuthSecret: !!process.env.AUTH_SECRET },
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        erro: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : null,
        diagnostico: {
          session: sess?.user ?? null,
          cookies: ck.getAll().map((c) => ({ name: c.name, len: c.value.length })),
          env: { appUrl: process.env.APP_URL, temAuthSecret: !!process.env.AUTH_SECRET },
        },
      },
      { status: 500 }
    );
  }
}
