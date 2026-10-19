import { CONTRACT_STATUS, SIGNER_STATUS } from "@/lib/status";

export function StatusBadge({ status, kind = "contract" }: { status: string; kind?: "contract" | "signer" }) {
  const map = kind === "contract" ? CONTRACT_STATUS : SIGNER_STATUS;
  const item = map[status] ?? { label: status, tone: "bg-paper text-ink-soft" };
  return (
    <span className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${item.tone}`}>
      {item.label}
    </span>
  );
}
