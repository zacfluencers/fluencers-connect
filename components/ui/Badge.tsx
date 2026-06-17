import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "active" | "success" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-white/5 text-[var(--muted)] border-white/10",
  info: "bg-[var(--accent-2)]/12 text-[var(--accent-2)] border-[var(--accent-2)]/25",
  active: "bg-[var(--accent)]/20 text-[#c7b8ff] border-[var(--accent-2)]/30",
  success: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  danger: "bg-rose-400/10 text-rose-300 border-rose-400/20",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export type { Tone as BadgeTone };
