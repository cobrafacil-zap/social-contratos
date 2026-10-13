export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#2F4BFF" />
        <path d="M8 18.5c3.5 2.5 6.5 1 7.5-2.5s2.5-5.5 5-4.5M8 21h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>Social Sign</span>
    </span>
  );
}
