"use client";

import { useEffect, useState } from "react";

const pct = (v: number, min: number, max: number) =>
  ((v - min) / (max - min)) * 100;

/**
 * Dual-handle range slider. Updates live as you drag; commits the final value
 * (to the URL, via onCommit) only when you let go — so we don't navigate on
 * every pixel.
 */
export function DualRange({
  label,
  min,
  max,
  step = 1,
  value,
  onCommit,
  format = (v) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onCommit: (value: [number, number]) => void;
  format?: (v: number) => string;
}) {
  const [lo, setLo] = useState(value[0]);
  const [hi, setHi] = useState(value[1]);

  // Reflect external resets (e.g. "Clear all").
  useEffect(() => {
    setLo(value[0]);
    setHi(value[1]);
  }, [value]);

  const commit = () => onCommit([lo, hi]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="text-sm text-[var(--muted)]">
          {format(lo)} – {format(hi)}
          {hi >= max ? "+" : ""}
        </span>
      </div>

      <div className="relative h-5">
        {/* track */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[var(--surface-2)]" />
        {/* selected portion */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent-2)]"
          style={{
            left: `${pct(lo, min, max)}%`,
            width: `${pct(hi, min, max) - pct(lo, min, max)}%`,
          }}
        />
        <input
          type="range"
          className="range absolute inset-0"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) =>
            setLo(Math.min(Number(e.target.value), hi - step))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          onTouchEnd={commit}
          aria-label={`${label} minimum`}
        />
        <input
          type="range"
          className="range absolute inset-0"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) =>
            setHi(Math.max(Number(e.target.value), lo + step))
          }
          onPointerUp={commit}
          onKeyUp={commit}
          onTouchEnd={commit}
          aria-label={`${label} maximum`}
        />
      </div>
    </div>
  );
}

/** Single "minimum" slider — used for follower counts ("at least X"). */
export function MinSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onCommit,
  format = (v) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onCommit: (value: number) => void;
  format?: (v: number) => string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="text-sm text-[var(--muted)]">
          {v <= min ? "Any" : `${format(v)}+`}
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[var(--surface-2)]" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent-2)]"
          style={{ width: `${pct(v, min, max)}%` }}
        />
        <input
          type="range"
          className="range absolute inset-0"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          onPointerUp={() => onCommit(v)}
          onKeyUp={() => onCommit(v)}
          onTouchEnd={() => onCommit(v)}
          aria-label={label}
        />
      </div>
    </div>
  );
}
