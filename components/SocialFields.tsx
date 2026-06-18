"use client";

import { useState, useTransition } from "react";
import { HandleInput } from "@/components/ui/PrefixedInput";
import { fetchFollowers } from "@/app/actions/social";

/**
 * Instagram + TikTok handles and follower counts, with an "auto-fill" button
 * that scrapes the public follower count from the entered handles (best-effort
 * — see lib/social/scrape.ts). Counts remain editable for manual override.
 */
export function SocialFields({
  defaultInstagram,
  defaultTiktok,
  defaultIgFollowers,
  defaultTtFollowers,
}: {
  defaultInstagram?: string | null;
  defaultTiktok?: string | null;
  defaultIgFollowers?: number | null;
  defaultTtFollowers?: number | null;
}) {
  const [ig, setIg] = useState((defaultInstagram ?? "").replace(/^@+/, ""));
  const [tt, setTt] = useState((defaultTiktok ?? "").replace(/^@+/, ""));
  const [igF, setIgF] = useState(
    defaultIgFollowers != null ? String(defaultIgFollowers) : "",
  );
  const [ttF, setTtF] = useState(
    defaultTtFollowers != null ? String(defaultTtFollowers) : "",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function autoFill() {
    setMsg(null);
    start(async () => {
      const r = await fetchFollowers({ instagram: ig, tiktok: tt });
      const got: string[] = [];
      const missed: string[] = [];
      if (ig) {
        if (r.instagram != null) {
          setIgF(String(r.instagram));
          got.push("Instagram");
        } else missed.push("Instagram");
      }
      if (tt) {
        if (r.tiktok != null) {
          setTtF(String(r.tiktok));
          got.push("TikTok");
        } else missed.push("TikTok");
      }
      if (got.length && !missed.length) setMsg(`Updated ${got.join(" & ")}.`);
      else if (got.length)
        setMsg(`Updated ${got.join(" & ")}. Couldn't read ${missed.join(" & ")} — enter manually.`);
      else setMsg("Couldn't fetch right now — please enter the numbers manually.");
    });
  }

  return (
    <fieldset className="rounded-xl border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
        Social profiles
      </legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HandleInput label="Instagram" name="instagram" value={ig} onValueChange={setIg} />
        <HandleInput label="TikTok" name="tiktok" value={tt} onValueChange={setTt} />
        <NumberField label="Instagram followers" name="instagram_followers" value={igF} onChange={setIgF} placeholder="e.g. 12400" />
        <NumberField label="TikTok followers" name="tiktok_followers" value={ttF} onChange={setTtF} placeholder="e.g. 8300" />
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Enter your follower counts, or use the button to try auto-filling them
        from your @handles (Instagram can be rate-limited — just type it in if so).
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={autoFill}
          disabled={pending || (!ig && !tt)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10 px-3.5 py-2 text-sm font-medium text-[var(--accent-2)] transition-colors hover:bg-[var(--accent-2)]/20 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {pending ? "Fetching…" : "Auto-fill from handles"}
        </button>
        {msg && <span className="text-xs text-[var(--muted)]">{msg}</span>}
      </div>
    </fieldset>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        name={name}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
      />
    </label>
  );
}
