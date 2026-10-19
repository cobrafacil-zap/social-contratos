import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-extrabold tracking-tight text-ink-mute/40">404</p>
      <p className="mt-3 text-lg font-bold">Página não encontrada</p>
      <p className="mt-1 text-ink-mute">O endereço que você acessou não existe ou foi removido.</p>
      <Link href="/dashboard" className="btn mt-6 inline-flex">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
