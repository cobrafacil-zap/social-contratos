"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-paper-line"><Menu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl" onClick={() => setOpen(false)}>
            <button type="button" aria-label="Fechar menu" className="absolute right-3 top-4 rounded-lg p-2 text-ink-mute"><X className="h-5 w-5" /></button>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
