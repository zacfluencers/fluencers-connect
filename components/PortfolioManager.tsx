"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPortfolioItem, deletePortfolioItem } from "@/app/actions/portfolio";
import type { PortfolioItem } from "@/lib/types";

const MAX_MB = 50;

/**
 * Upload + manage portfolio videos. Files go to Supabase Storage; rows are
 * recorded via server actions. Display is locked to a 9:16 vertical frame.
 */
export function PortfolioManager({
  userId,
  items,
}: {
  userId: string;
  items: PortfolioItem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("video/")) {
          setError("Only video files are allowed.");
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`Each video must be under ${MAX_MB}MB.`);
          continue;
        }

        const ext = file.name.split(".").pop() || "mp4";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("portfolio")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadErr) {
          setError(uploadErr.message);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("portfolio").getPublicUrl(path);

        const result = await addPortfolioItem({
          imageUrl: publicUrl,
          storagePath: path,
        });
        if ("error" in result) setError(result.error);
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePortfolioItem(id);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-black"
          >            <video
              src={item.image_url}
              className="h-full w-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={pending}
              aria-label="Delete video"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Upload tile (matches the 9:16 frame) */}
        <label className="flex aspect-[9/16] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--border-strong)] text-center text-sm text-[var(--muted)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]">
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={onFiles}
            disabled={uploading}
            className="hidden"
          />
          <span className="text-2xl">＋</span>
          <span>{uploading ? "Uploading…" : "Add video"}</span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">
        Vertical video (9:16), MP4 or MOV, up to {MAX_MB}MB each. Shown on your
        public profile.
      </p>
    </div>
  );
}
