import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo light />
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Contratos assinados, guardados e comprováveis.</h1>
          <p className="mt-4 text-white/70">Cada assinatura registra documento, data, IP e dispositivo, para você ter prova, não só uma imagem no PDF.</p>
        </div>
        <p className="text-sm text-white/50">Crie sua conta e comece a assinar em minutos.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-extrabold tracking-tight">Criar sua conta</h2>
          <p className="mb-6 mt-1.5 text-ink-mute">Preencha os dados abaixo para criar sua empresa e administrador.</p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-ink-mute">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-semibold text-cobalt hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
