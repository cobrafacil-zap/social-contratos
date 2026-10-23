import type { Config } from "tailwindcss";

/**
 * Todas as cores são variáveis CSS (ver `globals.css`).
 * Isso permite alternar entre o tema claro e o escuro só mudando o atributo
 * `data-theme` no <html> — nenhuma classe de componente precisa mudar.
 */
const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Texto
        ink: {
          DEFAULT: "var(--c-ink)",
          soft: "var(--c-ink-soft)",
          mute: "var(--c-ink-mute)",
        },
        // Superfícies
        paper: {
          DEFAULT: "var(--c-paper)",
          card: "var(--c-card)",
          line: "var(--c-line)",
        },
        card: "var(--c-card)",
        // Superfície escura fixa (heróis, botões primários) — sempre escura,
        // para `text-white` continuar legível nos dois temas.
        solid: "var(--c-solid)",
        // Marca
        cobalt: {
          DEFAULT: "var(--c-cobalt)",
          dark: "var(--c-cobalt-dark)",
          tint: "var(--c-cobalt-tint)",
        },
        ok: { DEFAULT: "var(--c-ok)", tint: "var(--c-ok-tint)" },
        warn: { DEFAULT: "var(--c-warn)", tint: "var(--c-warn-tint)" },
        bad: { DEFAULT: "var(--c-bad)", tint: "var(--c-bad-tint)" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: {
        soft: "var(--sh-soft)",
        card: "var(--sh-card)",
        lift: "var(--sh-lift)",
        glow: "var(--sh-glow)",
      },
      borderRadius: {
        xl2: "1.125rem",
        "2xl": "1.25rem",
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
