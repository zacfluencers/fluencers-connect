"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadToBucketWithProgress } from "@/lib/upload";
import { recordDeliverable, deleteDeliverable } from "@/app/actions/deliverables";
import type { BookingDeliverable, BookingStatus } from "@/lib/types";

// Must stay at or below the smaller of the bucket limit and the project-wide
// storage limit in the Supabase dashboard. See 0027_raise_upload_limits.sql.
const MAX_MB = 500;

/**
 * Real content delivery. The creator uploads files (video/image) straight to
 * Supabase Storage; the brand reviews and downloads them. Replaces the old
 * mock placeholder panel.
 */
export function Deliverables({
  bookingId,
  userId,
  role,
  status,
  deliverables,
}: {
  bookingId: string;
  userId: string;
  role: "brand" | "creator";
  status: BookingStatus;
  deliverables: BookingDeliverable[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canUpload =
    role === "creator" &&
    ["accepted", "in_progress", "in_review"].includes(status);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    setQueue({ done: 0, total: files.length });

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

        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`Each file must be under ${MAX_MB}MB.`);
          continue;
        }

        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${bookingId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await uploadToBucketWithProgress({
          bucket: "deliverables",
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
        } = supabase.storage.from("deliverables").getPublicUrl(path);

        const result = await recordDeliverable({
          bookingId,
          url: publicUrl,
          storagePath: path,
          name: file.name,
          size: file.size,
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
      const result = await deleteDeliverable(id);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {deliverables.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {deliverables.map((d) => (
            <DeliverableTile
              key={d.id}
              item={d}
              canRemove={canUpload}
              onRemove={() => remove(d.id)}
              disabled={pending}
            />
          ))}
        </div>
      ) : (
        !canUpload && (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center">
            <p className="text-sm text-[var(--foreground)]">
              {role === "creator"
                ? "Delivery opens once the booking is accepted."
                : "No content delivered yet."}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Files appear here for review and download.
            </p>
          </div>
        )
      )}

      {canUpload && (
        <div className="mt-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--muted)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]">
            <input
              type="file"
              accept="video/*,image/*"
              multiple
              onChange={onFiles}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <div className="w-full max-w-xs">
                <p className="mb-2 font-medium text-[var(--foreground)]">{progress}%</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-2)] transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {queue.total > 1 && (
                  <p className="mt-2 text-xs">
                    File {queue.done + 1} of {queue.total}
                  </p>
                )}
              </div>
            ) : (
              <>
                <span className="text-2xl">＋</span>
                <span>Upload deliverables</span>
                <span className="text-xs">Video or images - up to {MAX_MB}MB each.</span>
              </>
            )}
          </label>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Add your files here, then use{" "}
            <span className="text-[var(--foreground)]">“Submit for review”</span> to
            send them to the brand.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function DeliverableTile({
  item,
  canRemove,
  onRemove,
  disabled,
}: {
  item: BookingDeliverable;
  canRemove: boolean;
  onRemove: () => void;
  disabled: boolean;
}) {
  // Signed URLs end in ?token=…, so detect type from the stored filename/path.
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(
    item.name || item.storage_path || item.url,
  );
  return (
    <div className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-[var(--border)] bg-black">
      {isVideo ? (
        <video
          src={`${item.url}#t=0.1`}
          className="h-full w-full object-contain"
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.name ?? "Deliverable"} className="h-full w-full object-contain" />
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur"
      >
        <span className="truncate">{item.name ?? "file"}</span>
        <span aria-hidden>↓</span>
      </a>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove file"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}
