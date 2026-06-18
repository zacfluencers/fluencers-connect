"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_MB = 10;

/**
 * Upload a single image to the public `avatars` bucket and expose its URL via a
 * hidden input (so it submits with the surrounding form). Falls back to nothing
 * if cleared — callers decide the placeholder.
 */
export function ImageUpload({
  userId,
  name,
  defaultUrl,
  label = "Upload image",
}: {
  userId: string;
  name: string;
  defaultUrl?: string | null;
  label?: string;
}) {
  const supabase = createClient();
  const [url, setUrl] = useState<string>(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setUrl(publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 20" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5">
            <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="hidden" />
            {uploading ? "Uploading…" : url ? "Change" : label}
          </label>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
