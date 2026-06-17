"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { NICHES } from "@/lib/niches";

/**
 * Marketplace filter bar. Filters live in the URL (?niche=&available=) so the
 * server component can read them and re-fetch — shareable + bookmarkable.
 */
export function MarketplaceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeNiche = searchParams.get("niche") ?? "";
  const availableOnly = searchParams.get("available") === "true";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/marketplace?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={activeNiche}
        onChange={(e) => setParam("niche", e.target.value || null)}
        className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-2)]/70"
      >
        <option value="">All niches</option>
        {NICHES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setParam("available", availableOnly ? null : "true")}
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

      {(activeNiche || availableOnly) && (
        <button
          type="button"
          onClick={() => router.push("/marketplace")}
          className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
