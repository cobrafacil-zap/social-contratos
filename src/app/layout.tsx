import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Social Sign", template: "%s · Social Sign" },
  robots: { index: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e15" },
  ],
};

/**
 * Roda antes da primeira pintura para aplicar o tema salvo (ou o do sistema),
 * assim a página não pisca entre claro e escuro.
 */
const themeScript = `(function(){try{
  var k="social-sign-theme";
  var s=localStorage.getItem(k);
  var d=(s==="dark")||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  var t=d?"dark":"light";
  document.documentElement.dataset.theme=t;
  document.documentElement.style.colorScheme=t;
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
