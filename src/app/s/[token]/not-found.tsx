import Link from "next/link";

export default function SignNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-xl border border-paper-line bg-white p-8 text-center">
        <p className="text-4xl font-extrabold tracking-tight">Link inválido</p>
        <p className="mt-2 text-ink-mute">
          Este link de assinatura não existe, expirou ou foi revogado. Peça um novo link ao responsável da empresa.
        </p>
        <Link href="/login" className="btn mt-6 inline-flex">
          Ir para o login
        </Link>
      </div>
    </main>
  );
}
