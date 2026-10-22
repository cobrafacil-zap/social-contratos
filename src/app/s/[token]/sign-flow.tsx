"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Acompanha em que passo da assinatura o cliente está, para a barra do topo
 * avançar conforme ele faz cada etapa:
 *
 *   0 → Ler o documento
 *   1 → Preencher seus dados
 *   2 → Assinar
 *   3 → Concluído
 */
type ProgressState = {
  step: number;
  /** Marca todos os passos até `n` como concluídos. */
  reach: (n: number) => void;
};

const ProgressContext = createContext<ProgressState>({ step: 0, reach: () => {} });

export function useSignProgress() {
  return useContext(ProgressContext);
}

export function SignFlow({
  children,
  startAt = 0,
  doneScreen,
}: {
  children: ReactNode;
  startAt?: number;
  /** Tela final (obrigado). Quando o passo 3 é atingido, ela substitui a assinatura. */
  doneScreen?: ReactNode;
}) {
  const [step, setStep] = useState(startAt);

  const reach = useCallback((n: number) => {
    setStep((prev) => (n > prev ? n : prev));
  }, []);

  const value = useMemo(() => ({ step, reach }), [step, reach]);

  const concluido = step >= 3 && Boolean(doneScreen);

  return (
    <ProgressContext.Provider value={value}>
      {!concluido && <ProgressSteps />}
      {concluido ? doneScreen : children}
    </ProgressContext.Provider>
  );
}

const STEPS = ["Ler o documento", "Preencher seus dados", "Assinar"];

function ProgressSteps() {
  const { step } = useSignProgress();
  const pct = step === 0 ? 6 : Math.round((step / STEPS.length) * 100);

  return (
    <div className="sticky top-0 z-30 border-b border-paper-line bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-paper-line">
          <div
            className="h-full rounded-full bg-cobalt transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
          <span className="ss-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full" />
        </div>

        <ol className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-semibold">
          {STEPS.map((label, i) => {
            const done = step > i;
            const current = step === i;
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-1.5 transition-colors duration-500 ${
                  done ? "text-ok" : current ? "text-cobalt" : "text-ink-mute/50"
                }`}
              >
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${
                    done
                      ? "bg-ok text-white"
                      : current
                        ? "bg-cobalt text-white ring-4 ring-cobalt/15"
                        : "bg-paper-line text-ink-mute/70"
                  }`}
                  style={{ height: 18, width: 18 }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * Observa o fim do documento: quando o cliente chega lá (rolou tudo), conclui o
 * passo 1 ("Ler o documento") e libera o passo 2.
 */
export function ReadTracker() {
  const { reach } = useSignProgress();
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      reach(1);
    };

    if (typeof IntersectionObserver === "undefined") {
      finish();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            finish();
            io.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" }
    );
    io.observe(el);

    // Se o documento for curto e já couber na tela, conta como lido.
    const timer = window.setTimeout(finish, 4000);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reach]);

  return <div ref={ref} aria-hidden />;
}

/** Botão "Continuar" que pulam direto para o formulário, sem precisar rolar. */
export function ContinueButton() {
  const { reach } = useSignProgress();
  return (
    <button
      type="button"
      onClick={() => {
        reach(1);
        document.getElementById("assinatura")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white transition-all duration-200 hover:bg-cobalt active:scale-[0.99]"
    >
      Já li o documento — continuar
    </button>
  );
}
