import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#10131A", soft: "#3B4252", mute: "#6B7385" },
        paper: { DEFAULT: "#F6F7F9", card: "#FFFFFF", line: "#E4E7EC" },
        cobalt: { DEFAULT: "#2F4BFF", dark: "#2339D6", tint: "#EAEEFF" },
        ok: { DEFAULT: "#12805C", tint: "#E3F4EC" },
        warn: { DEFAULT: "#A86400", tint: "#FFF1D6" },
        bad: { DEFAULT: "#B42318", tint: "#FDE8E6" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
