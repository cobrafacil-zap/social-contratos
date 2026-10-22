import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, PUBLIC } from "./auth.config";

const { auth } = NextAuth(authConfig);

const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p));
  if (!req.auth && !isPublic) {
    // API: responde 401 em JSON. Um redirect (307) faria o fetch seguir para
    // /login e receber HTML, quebrando o `res.json()` do front.
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Sessão expirada. Entre novamente para continuar." }, { status: 401 });
    }
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return res;
});

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
