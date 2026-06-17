import type { ReactNode } from "react";

const FIELD =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)]/60 outline-none transition-colors focus:border-[var(--accent-2)]/70 focus:ring-2 focus:ring-[var(--accent-2)]/25";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <textarea {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}
