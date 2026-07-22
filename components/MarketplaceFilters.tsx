"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { NICHES } from "@/lib/niches";
import {
  GENDERS,
  COUNTRIES,
  AGE_MIN,
  AGE_MAX,
  RATE_MAX,
  FOLLOWERS_MAX,
} from "@/lib/demographics";
import { gbp, formatFollowers } from "@/lib/format";
import { DualRange, MinSlider } from "@/components/ui/RangeSlider";

/**
 * Marketplace filter bar. Every filter lives in the URL so a filtered view is
 * shareable + bookmarkable, and the server component re-fetches from it.
 */
export function MarketplaceFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [showMore, setShowMore] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);

  const niches = (sp.get("niches") ?? "").split(",").filter(Boolean);
  const gender = sp.get("gender") ?? "";
  const country = sp.get("country") ?? "";
  const availableOnly = sp.get("available") === "true";

  const num = (key: string, fallback: number) => {
    const v = Number(sp.get(key));
    return Number.isFinite(v) && sp.get(key) != null ? v : fallback;
  };
  const ageMin = num("ageMin", AGE_MIN);
  const ageMax = num("ageMax", AGE_MAX);
  const rateMin = num("rateMin", 0);
  const rateMax = num("rateMax", RATE_MAX);
  const igMin = num("igMin", 0);
  const ttMin = num("ttMin", 0);

  /** Apply a batch of param updates and navigate once. */
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      // Any filter change means a different set of results, so page 3 of the
      // old set is meaningless. Always go back to the first page.
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/marketplace?${qs}` : "/marketplace");
    },
    [router, sp],
  );

  const toggleNiche = (n: string) => {
    const next = niches.includes(n)
      ? niches.filter((x) => x !== n)
      : [...niches, n];
    setParams({ niches: next.join(",") || null });
  };

  const anyActive =
    niches.length > 0 ||
    gender ||
    country ||
    availableOnly ||
    ageMin !== AGE_MIN ||
    ageMax !== AGE_MAX ||
    rateMin !== 0 ||
    rateMax !== RATE_MAX ||
    igMin > 0 ||
    ttMin > 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4 sm:p-5">
      {/* Primary row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Industry (multi-select) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIndustryOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent-2)]/60"
          >
            Industry
            {niches.length > 0 && (
              <span className="rounded-full bg-[var(--accent-2)] px-1.5 text-xs font-semibold text-white">
                {niches.length}
              </span>
            )}
            <Chevron open={industryOpen} />
          </button>
          {industryOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIndustryOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 max-h-72 w-64 overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-1.5 shadow-xl">
                {NICHES.map((n) => {
                  const on = niches.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleNiche(n)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          on
                            ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-white"
                            : "border-[var(--border-strong)]"
                        }`}
                      >
                        {on && <CheckIcon />}
                      </span>
                      <span className="text-[var(--foreground)]">{n}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Select
          value={gender}
          onChange={(v) => setParams({ gender: v })}
          placeholder="Any gender"
        >
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>

        <Select
          value={country}
          onChange={(v) => setParams({ country: v })}
          placeholder="Any country"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => setParams({ available: availableOnly ? null : "true" })}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition-colors ${
            availableOnly
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--accent-2)]/50"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              availableOnly ? "bg-emerald-400" : "bg-[var(--muted)]"
            }`}
          />
          Available only
        </button>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <SlidersIcon />
          {showMore ? "Fewer filters" : "More filters"}
        </button>

        {anyActive && (
          <button
            type="button"
            onClick={() => router.push("/marketplace")}
            className="ml-auto text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected industry chips */}
      {niches.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {niches.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleNiche(n)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-2)]/15 px-3 py-1 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--accent-2)]/25"
            >
              {n}
              <span className="text-[var(--muted)]">✕</span>
            </button>
          ))}
        </div>
      )}

      {/* Advanced sliders */}
      {showMore && (
        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
          <DualRange
            label="Age"
            min={AGE_MIN}
            max={AGE_MAX}
            value={[ageMin, ageMax]}
            onCommit={([lo, hi]) =>
              setParams({
                ageMin: lo === AGE_MIN ? null : String(lo),
                ageMax: hi === AGE_MAX ? null : String(hi),
              })
            }
          />
          <DualRange
            label="Rate"
            min={0}
            max={RATE_MAX}
            step={50}
            value={[rateMin, rateMax]}
            format={(v) => gbp.format(v)}
            onCommit={([lo, hi]) =>
              setParams({
                rateMin: lo === 0 ? null : String(lo),
                rateMax: hi === RATE_MAX ? null : String(hi),
              })
            }
          />
          <MinSlider
            label="Instagram followers"
            min={0}
            max={FOLLOWERS_MAX}
            step={5000}
            value={igMin}
            format={(v) => formatFollowers(v) ?? "0"}
            onCommit={(v) => setParams({ igMin: v === 0 ? null : String(v) })}
          />
          <MinSlider
            label="TikTok followers"
            min={0}
            max={FOLLOWERS_MAX}
            step={5000}
            value={ttMin}
            format={(v) => formatFollowers(v) ?? "0"}
            onCommit={(v) => setParams({ ttMin: v === 0 ? null : String(v) })}
          />
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string | null) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-2)]/70"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
