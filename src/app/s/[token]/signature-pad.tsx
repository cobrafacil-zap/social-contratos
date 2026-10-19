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
    <div className="rounded-xl border border-paper-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={useTyped}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${
              mode === "TYPED" ? "bg-cobalt text-white" : "border border-paper-line text-ink-soft"
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
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${
              mode === "DRAWN" ? "bg-cobalt text-white" : "border border-paper-line text-ink-soft"
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
            <p
              className="mt-4 rounded-lg border border-dashed border-paper-line bg-paper px-4 py-6 text-center text-2xl"
              style={{ fontFamily: "cursive" }}
            >
              {typed}
            </p>
          )}
        </>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={800}
            height={260}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={stop}
            onPointerLeave={stop}
            className="w-full touch-none rounded-lg border border-dashed border-paper-line bg-white"
            style={{ cursor: "crosshair" }}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-ink-mute">Assine com o mouse ou o dedo</p>
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-paper-line px-2.5 text-xs font-semibold text-ink-soft"
            >
              <Eraser className="h-3.5 w-3.5" /> Limpar
            </button>
          </div>
          {hasInk && <p className="mt-1 text-xs text-ok">Assinatura desenhada capturada.</p>}
        </>
      )}
    </div>
  );
}
