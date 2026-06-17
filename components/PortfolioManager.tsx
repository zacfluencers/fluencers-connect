"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPortfolioItem, deletePortfolioItem } from "@/app/actions/portfolio";
import type { PortfolioItem } from "@/lib/types";

const MAX_MB = 5;

/** Upload + manage portfolio images. Files go to Supabase Storage; rows are recorded via server actions. */
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
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`Each image must be under ${MAX_MB}MB.`);
          continue;
        }

        const ext = file.name.split(".").pop() || "jpg";
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--foreground)]/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt="Portfolio item"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={pending}
              aria-label="Delete image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Upload tile */}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--foreground)]/20 text-center text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            disabled={uploading}
            className="hidden"
          />
          <span className="text-2xl">＋</span>
          <span>{uploading ? "Uploading…" : "Add image"}</span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">
        JPG or PNG, up to {MAX_MB}MB each. These show on your public profile.
      </p>
    </div>
  );
}
