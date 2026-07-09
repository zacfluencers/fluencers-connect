"use client";

import { useState, useTransition } from "react";
import { HandleInput } from "@/components/ui/PrefixedInput";
import type { SocialPlatform } from "@/lib/social/scrapecreators";

type Status = "idle" | "loading" | "success" | "error";

const STATUS_COPY: Record<Exclude<Status, "idle">, string> = {
  loading: "Fetching profile data…",
  success: "Profile data updated",
  error:
    "We couldn’t fetch this profile. Please check the handle and try again.",
};

/**
 * Instagram + TikTok handles and follower counts, plus a button that enriches
 * the profile from the entered @handles via ScrapeCreators (server-side — see
 * /api/creator/enrich-social-profile and lib/social/*). The enrichment is saved
 * immediately; the follower fields also update here and stay editable.
 */
export function SocialFields({
  creatorId,
  defaultInstagram,
  defaultTiktok,
  defaultIgFollowers,
  defaultTtFollowers,
}: {
  /** The signed-in creator's id — they can only enrich their own profile. */
  creatorId: string;
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
  const [status, setStatus] = useState<Status>("idle");
  const [pending, start] = useTransition();

  async function enrichOne(platform: SocialPlatform, handle: string) {
    try {
      const res = await fetch("/api/creator/enrich-social-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorId, platform, handle }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        profile?: { followerCount?: number };
      };
      return data.profile ?? null;
    } catch {
      return null;
    }
  }

  function autoFill() {
    setStatus("loading");
    start(async () => {
      const jobs: Array<Promise<{ platform: SocialPlatform; followerCount?: number } | null>> = [];
      if (ig.trim())
        jobs.push(enrichOne("instagram", ig).then((p) => (p ? { platform: "instagram", ...p } : null)));
      if (tt.trim())
        jobs.push(enrichOne("tiktok", tt).then((p) => (p ? { platform: "tiktok", ...p } : null)));

      const results = await Promise.all(jobs);
      let any = false;
      for (const r of results) {
        if (!r) continue;
        any = true;
        if (r.followerCount != null) {
          if (r.platform === "instagram") setIgF(String(r.followerCount));
          else setTtF(String(r.followerCount));
        }
      }
      setStatus(any ? "success" : "error");
    });
  }

  const activeStatus: Exclude<Status, "idle"> | null = pending
    ? "loading"
    : status === "idle"
      ? null
      : status;

  return (
    <fieldset className="rounded-xl border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
        Social profiles
      </legend>

      <p className="mb-3 text-xs text-[var(--muted)]">
        Add your social profiles and we’ll auto-fill key details like followers,
        profile image and engagement where available.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HandleInput label="Instagram" name="instagram" value={ig} onValueChange={setIg} />
        <HandleInput label="TikTok" name="tiktok" value={tt} onValueChange={setTt} />
        <NumberField label="Instagram followers" name="instagram_followers" value={igF} onChange={setIgF} placeholder="e.g. 12400" />
        <NumberField label="TikTok followers" name="tiktok_followers" value={ttF} onChange={setTtF} placeholder="e.g. 8300" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={autoFill}
          disabled={pending || (!ig.trim() && !tt.trim())}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10 px-3.5 py-2 text-sm font-medium text-[var(--accent-2)] transition-colors hover:bg-[var(--accent-2)]/20 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {pending ? "Fetching profile data…" : "Auto-fill from social profiles"}
        </button>
        {activeStatus && (
          <span
            className={`text-xs ${
              activeStatus === "error"
                ? "text-rose-300"
                : activeStatus === "success"
                  ? "text-emerald-300"
                  : "text-[var(--muted)]"
            }`}
          >
            {STATUS_COPY[activeStatus]}
          </span>
        )}
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
