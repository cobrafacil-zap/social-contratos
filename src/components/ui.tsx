import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-ink-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-paper-line bg-white ${className}`}>{children}</section>;
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-paper-line px-5 py-4">
      <h2 className="text-base font-bold">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-ink-mute/60">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function EmptyPage({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-paper-line bg-white px-6 py-16 text-center">
      <p className="text-lg font-bold">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-ink-mute">{description}</p>}
      {action && (
        <Link href={action.href} className="btn mt-6 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success" | "warn";
}) {
  const tones = {
    info: "bg-cobalt-tint text-cobalt",
    error: "bg-bad-tint text-bad",
    success: "bg-ok-tint text-ok",
    warn: "bg-warn-tint text-warn",
  } as const;
  return <div className={`rounded-lg px-3.5 py-2.5 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-paper-line bg-white p-4">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  hint,
  min,
  max,
  step,
  minLength,
  maxLength,
  inputMode,
  autoComplete,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url" | "search" | "none";
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={`field ${className}`}
      />
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  name,
  placeholder,
  required,
  defaultValue,
  rows = 4,
  hint,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        className="field h-auto py-2.5 leading-relaxed"
      />
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  required,
  defaultValue,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-paper-line text-cobalt focus:ring-cobalt/30"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-mute">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingText,
  variant = "primary",
}: {
  children: ReactNode;
  pending?: boolean;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    primary: "bg-cobalt text-white hover:bg-cobalt-dark",
    secondary: "border border-paper-line bg-white text-ink-soft hover:bg-paper",
    danger: "bg-bad text-white hover:brightness-95",
  } as const;
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles[variant]}`}>
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
