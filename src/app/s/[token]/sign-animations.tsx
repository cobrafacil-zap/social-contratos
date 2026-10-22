"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Revelação suave dos blocos ao rolar a página                              */
/* -------------------------------------------------------------------------- */

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`ss-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tela de sucesso com check desenhado + confete                              */
/* -------------------------------------------------------------------------- */

export function SuccessAnimation({ children }: { children: ReactNode }) {
  const [confetti] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      left: `${6 + ((i * 37) % 88)}%`,
      delay: `${(i % 6) * 120}ms`,
      drift: `${((i % 5) - 2) * 26}px`,
      spin: 260 + (i % 4) * 140,
      color: ["#2F4BFF", "#12805C", "#A86400", "#B42318", "#10131A"][i % 5],
    }))
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-ok/30 bg-ok-tint px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="ss-confetti"
            style={
              {
                left: c.left,
                backgroundColor: c.color,
                animationDelay: c.delay,
                "--ss-drift": c.drift,
                "--ss-spin": `${c.spin}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative">
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          <span
            className="ss-pulse-ring absolute inset-0 rounded-full bg-ok/40"
            aria-hidden
          />
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ok text-white shadow-lg shadow-ok/25">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden>
              <path
                className="ss-check-path"
                d="M4.5 12.5l5 5 10-11"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <h2 className="ss-pop text-2xl font-extrabold tracking-tight text-ok">
          Contrato assinado com sucesso!
        </h2>
        <p className="ss-pop mx-auto mt-2 max-w-md text-ink-soft" style={{ animationDelay: "180ms" }}>
          {children}
        </p>
      </div>
    </div>
  );
}
