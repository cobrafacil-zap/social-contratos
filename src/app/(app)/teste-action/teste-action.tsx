"use client";
import { useState, useTransition } from "react";
import { acaoTesteSemDB } from "./actions";

export function TesteAction() {
  const [resultado, setResultado] = useState<string>("");
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        onClick={() => start(async () => { const r = await acaoTesteSemDB(); setResultado(JSON.stringify(r)); })}
      >
        Chamar action
      </button>
      <p>{resultado}</p>
      {pending && <p>carregando...</p>}
    </div>
  );
}
