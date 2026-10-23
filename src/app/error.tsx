"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-xl border border-paper-line bg-card p-8 text-center">
        <p className="text-lg font-extrabold">Algo deu errado</p>
        <p className="mt-2 text-sm text-ink-mute">
          Ocorreu um erro inesperado ao carregar esta página. Tente novamente em instantes.
        </p>
        <button type="button" onClick={reset} className="btn mt-6 inline-flex">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
