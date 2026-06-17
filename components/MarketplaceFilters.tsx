"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Filter bar for the marketplace. Filters live in the URL (?niche=&available=)
 * so the server component can read them and re-fetch — shareable + bookmarkable.
 */
export function MarketplaceFilters({ niches }: { niches: string[] }) {
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
      {/* Niche dropdown */}
      <select
        value={activeNiche}
        onChange={(e) => setParam("niche", e.target.value || null)}
        className="rounded-full border border-[var(--foreground)]/15 bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/40"
      >
        <option value="">All niches</option>
        {niches.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {/* Availability toggle */}
      <button
        type="button"
        onClick={() => setParam("available", availableOnly ? null : "true")}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
          availableOnly
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-[var(--foreground)]/15 text-[var(--foreground)] hover:border-[var(--foreground)]/40"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            availableOnly ? "bg-emerald-500" : "bg-[var(--muted)]"
          }`}
        />
        Available only
      </button>

      {/* Clear */}
      {(activeNiche || availableOnly) && (
        <button
          type="button"
          onClick={() => router.push("/marketplace")}
          className="text-sm text-[var(--muted)] underline-offset-4 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
