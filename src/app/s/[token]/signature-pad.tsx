"use client";
import { useRef, useState } from "react";
import { Eraser, PenLine, Type } from "lucide-react";

export type SignatureValue =
  | { method: "TYPED"; typedName: string }
  | { method: "DRAWN"; imageKey: string };

/** Canvas de assinatura desenhada (mouse + touch). */
export function SignaturePad({
  value,
  onChange,
  label,
  name,
}: {
  value: SignatureValue | null;
  onChange: (v: SignatureValue | null) => void;
  label: string;
  name: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"TYPED" | "DRAWN">("TYPED");
  const [typed, setTyped] = useState(value?.method === "TYPED" ? value.typedName : "");
  const [hasInk, setHasInk] = useState(false);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    drawing.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#10131A";
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }

  function stop() {
    if (!drawing.current) return;
    drawing.current = false;
    const data = canvasRef.current!.toDataURL("image/png");
    onChange({ method: "DRAWN", imageKey: data });
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  }

  function useTyped() {
    setMode("TYPED");
    onChange(typed.trim() ? { method: "TYPED", typedName: typed.trim() } : null);
  }

  return (
    <div className="rounded-xl border border-paper-line bg-white p-4 transition-shadow duration-300 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="relative flex gap-1.5 rounded-lg bg-paper p-1">
          <span
            className="absolute inset-y-1 w-[calc(50%-3px)] rounded-md bg-white shadow-sm transition-transform duration-300 ease-out"
            style={{ transform: mode === "TYPED" ? "translateX(0)" : "translateX(calc(100% + 6px))" }}
            aria-hidden
          />
          <button
            type="button"
            onClick={useTyped}
            className={`relative z-10 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-200 ${
              mode === "TYPED" ? "text-ink" : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            <Type className="h-3.5 w-3.5" /> Digitar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("DRAWN");
              onChange(null);
            }}
            className={`relative z-10 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-200 ${
              mode === "DRAWN" ? "text-ink" : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" /> Desenhar
          </button>
        </div>
      </div>

      {mode === "TYPED" ? (
        <>
          <input
            id={name}
            name={`${name}_typed`}
            type="text"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              onChange(e.target.value.trim() ? { method: "TYPED", typedName: e.target.value.trim() } : null);
            }}
            placeholder="Digite seu nome completo"
            className="field"
          />
          {typed.trim() && (
            <div className="ss-pop mt-4 rounded-lg border border-dashed border-paper-line bg-paper px-4 py-6 text-center">
              <p
                className="text-3xl leading-tight text-ink transition-all duration-300"
                style={{ fontFamily: "cursive" }}
              >
                {typed}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-ink-mute">Sua assinatura</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={260}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={stop}
              onPointerLeave={stop}
              className="ss-pop w-full touch-none rounded-lg border border-dashed border-paper-line bg-white"
              style={{ cursor: "crosshair" }}
            />
            {!hasInk && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-mute/70">
                Assine aqui com o mouse ou o dedo
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-ink-mute">
              {hasInk ? (
                <span className="font-semibold text-ok">Assinatura desenhada capturada.</span>
              ) : (
                "Assine com o mouse ou o dedo"
              )}
            </p>
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-paper-line px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper"
            >
              <Eraser className="h-3.5 w-3.5" /> Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
