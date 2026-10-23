import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-solid p-12 text-white lg:flex">
        <Logo light />
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Contratos assinados, guardados e comprováveis.</h1>
          <p className="mt-4 text-white/70">Cada assinatura registra documento, data, IP e dispositivo, para você ter prova, não só uma imagem no PDF.</p>
        </div>
        <p className="text-sm text-white/50">Acesso restrito a usuários autorizados.</p>
      </section>
      <section className="relative flex items-center justify-center p-6">
        <div className="absolute right-5 top-5">
          <ThemeToggle compact />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-extrabold tracking-tight">Entrar na sua conta</h2>
          <p className="mb-6 mt-1.5 text-ink-mute">Use o e-mail e a senha cadastrados pelo administrador.</p>
          <LoginForm next={next ?? "/dashboard"} />
          <p className="mt-6 text-center text-sm text-ink-mute">
            Ainda não tem uma conta?{" "}
            <Link href="/cadastro" className="font-semibold text-cobalt hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
