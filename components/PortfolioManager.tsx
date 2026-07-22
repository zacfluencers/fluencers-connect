"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPortfolioItem, deletePortfolioItem } from "@/app/actions/portfolio";
import { uploadToBucketWithProgress } from "@/lib/upload";
import type { PortfolioItem } from "@/lib/types";

// Must stay at or below the smaller of the bucket limit and the project-wide
// storage limit in the Supabase dashboard. See 0027_raise_upload_limits.sql.
const MAX_MB = 500;

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
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    setQueue({ done: 0, total: files.length });

    // The user's access token authorises the direct upload (RLS still applies).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again to upload.");
      setUploading(false);
      return;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setQueue({ done: i, total: files.length });
        setProgress(0);

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

        const { error: uploadErr } = await uploadToBucketWithProgress({
          bucket: "portfolio",
          path,
          file,
          token,
          onProgress: setProgress,
        });
        if (uploadErr) {
          setError(uploadErr);
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
      setProgress(0);
      setQueue({ done: 0, total: 0 });
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
              // #t=0.1 makes the browser render the first frame as the poster
              // instead of showing a black box before playback.
              src={`${item.image_url}#t=0.1`}
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
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow transition-colors hover:bg-black/90"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Upload tile (matches the 9:16 frame) */}
        <label className="flex aspect-[9/16] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] p-3 text-center text-sm text-[var(--muted)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]">
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={onFiles}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <div className="w-full px-1">
              <p className="mb-2 font-medium text-[var(--foreground)]">
                {progress}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-2)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {queue.total > 1 && (
                <p className="mt-2 text-xs">
                  Video {queue.done + 1} of {queue.total}
                </p>
              )}
            </div>
          ) : (
            <>
              <span className="text-2xl">＋</span>
              <span>Add video</span>
            </>
          )}
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">
        Vertical video (9:16), MP4 or MOV, up to {MAX_MB}MB each. Shown on your
        public profile. On mobile data, large clips take a while - wifi is
        steadier for anything over a minute long.
      </p>
    </div>
  );
}
