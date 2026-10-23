"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Moon, Sun, Monitor } from "lucide-react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "social-sign-theme";

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

/** Aplica o tema no <html> e guarda a preferência. */
export function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Botão que alterna entre claro, escuro e "automático" (segue o sistema).
 * O ciclo é: claro → escuro → automático → claro.
 */
export function ThemeToggle({
  className = "",
  compact = false,
  variant = "surface",
}: {
  className?: string;
  compact?: boolean;
  /** "onDark" é para uso sobre o herói escuro (que continua escuro nos dois temas). */
  variant?: "surface" | "onDark";
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  // Segue o sistema quando a preferência é "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    applyTheme(next);
  }

  const Icon = !mounted ? Monitor : theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = !mounted
    ? "Tema"
    : theme === "light"
      ? "Tema claro"
      : theme === "dark"
        ? "Tema escuro"
        : "Tema automático";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} — clique para alternar`}
      aria-label={`${label} — clique para alternar entre claro, escuro e automático`}
      className={clsx(
        "group inline-flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm font-semibold",
        "transition-all duration-300 ease-swift active:translate-y-0 active:scale-95",
        variant === "onDark"
          ? "border-white/15 bg-white/10 text-white/80 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
          : "border-paper-line bg-card text-ink-soft hover:-translate-y-0.5 hover:text-ink hover:shadow-[var(--sh-soft)]",
        className
      )}
    >
      <Icon
        className={clsx(
          "h-[18px] w-[18px] transition-transform duration-500 ease-swift",
          "group-hover:rotate-[18deg] group-hover:scale-110"
        )}
        aria-hidden
      />
      {!compact && <span className="hidden sm:inline">{label}</span>}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Aplica o tema salvo antes da primeira renderização (evita "piscar"). */
export function ThemeInit() {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
  return null;
}
