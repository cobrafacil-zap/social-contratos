"use client";
import { Printer } from "lucide-react";

/** Botão que abre a caixa de impressão do navegador (certificado). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Imprimir
    </button>
  );
}
