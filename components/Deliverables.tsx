"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadToBucketWithProgress } from "@/lib/upload";
import {
  recordDeliverable,
  addDeliverableEntry,
  deleteDeliverable,
} from "@/app/actions/deliverables";
import type { DeliveryDef } from "@/lib/services";
import type { BookingDeliverable, BookingStatus } from "@/lib/types";

// Must stay at or below the smaller of the bucket limit and the project-wide
// storage limit in the Supabase dashboard. See 0027_raise_upload_limits.sql.
const MAX_MB = 500;

/**
 * Delivery for a booking, in whatever form the service actually takes.
 *
 * UGC, B-Roll and Event Day hand over files. A Meta Whitelist hands over a
 * partnership ad code, and an Influencer Post hands over a link to the live
 * post - neither of which is a file, and both of which were previously faced
 * with an upload box and nothing else. The service decides which inputs show.
 */
export function Deliverables({
  bookingId,
  userId,
  role,
  status,
  delivery,
  deliverables,
}: {
  bookingId: string;
  userId: string;
  role: "brand" | "creator";
  status: BookingStatus;
  delivery: DeliveryDef;
  deliverables: BookingDeliverable[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDeliver =
    role === "creator" &&
    ["accepted", "in_progress", "in_review"].includes(status);

  const files = deliverables.filter((d) => d.kind === "file");
  const entries = deliverables.filter((d) => d.kind !== "file");

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (list.length === 0) return;

    setError(null);
    setUploading(true);
    setQueue({ done: 0, total: list.length });

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
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setQueue({ done: i, total: list.length });
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

  const nothingYet = deliverables.length === 0;
  const acceptsFiles = delivery.kinds.includes("file");

  return (
    <div className="space-y-3">
      {/* What this service expects, said once at the top. Without it a
          whitelisting creator has no idea the code goes in here. */}
      {canDeliver && <p className="text-sm text-[var(--muted)]">{delivery.prompt}</p>}

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((d) => (
            <EntryRow
              key={d.id}
              item={d}
              canRemove={canDeliver}
              onRemove={() => remove(d.id)}
              disabled={pending}
            />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((d) => (
            <DeliverableTile
              key={d.id}
              item={d}
              canRemove={canDeliver}
              onRemove={() => remove(d.id)}
              disabled={pending}
            />
          ))}
        </div>
      )}

      {nothingYet && !canDeliver && (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center">
          <p className="text-sm text-[var(--foreground)]">
            {role === "creator"
              ? "Delivery opens once the booking is accepted."
              : "Nothing delivered yet."}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {delivery.brandHint ?? "Files appear here for review and download."}
          </p>
        </div>
      )}

      {canDeliver && (
        <>
          {delivery.kinds.includes("link") && (
            <EntryInput
              bookingId={bookingId}
              kind="link"
              label={delivery.linkLabel ?? "Add a link"}
              placeholder={delivery.linkPlaceholder ?? "https://…"}
              onError={setError}
            />
          )}
          {delivery.kinds.includes("note") && (
            <EntryInput
              bookingId={bookingId}
              kind="note"
              label={delivery.noteLabel ?? "Add a note"}
              placeholder={delivery.notePlaceholder ?? ""}
              multiline
              onError={setError}
            />
          )}

          {acceptsFiles && (
            <div>
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
                    {/* Optional for the audience services - a screenshot is
                        useful proof, but nobody should think it's required. */}
                    <span>
                      {delivery.kinds[0] === "file"
                        ? "Upload deliverables"
                        : "Add a screenshot (optional)"}
                    </span>
                    <span className="text-xs">Video or images - up to {MAX_MB}MB each.</span>
                  </>
                )}
              </label>
            </div>
          )}

          <p className="text-xs text-[var(--muted)]">
            Add everything here, then use{" "}
            <span className="text-[var(--foreground)]">“Submit for review”</span> to
            send it to the brand.
          </p>
        </>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------- Link / note entry input */

function EntryInput({
  bookingId,
  kind,
  label,
  placeholder,
  multiline = false,
  onError,
}: {
  bookingId: string;
  kind: "link" | "note";
  label: string;
  placeholder: string;
  multiline?: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!value.trim()) return;
    onError(null);
    startTransition(async () => {
      const result = await addDeliverableEntry({ bookingId, kind, value });
      if ("error" in result) onError(result.error);
      else {
        setValue("");
        router.refresh();
      }
    });
  }

  const field =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60";

  return (
    <div className="rounded-xl border border-[var(--border)] p-3.5">
      <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className={field}
        />
      ) : (
        <input
          type="text"
          inputMode="url"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          // Enter submits, but only here - this panel sits inside no form, so
          // there's nothing else for the key to trigger.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className={field}
        />
      )}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !value.trim()}
        className="mt-2.5 rounded-full bg-[var(--accent-2)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Saving…" : "Add"}
      </button>
    </div>
  );
}

function EntryRow({
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
  const isLink = item.kind === "link" && item.url;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
      <span className="mt-0.5 shrink-0 text-[var(--accent-2)]" aria-hidden>
        {isLink ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        {isLink ? (
          <a
            href={item.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-sm text-[var(--accent-2)] underline underline-offset-4"
          >
            {item.url}
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
            {item.note}
          </p>
        )}
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove"
          className="shrink-0 rounded-lg px-2 py-1 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-rose-300"
        >
          ✕
        </button>
      )}
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
    item.name || item.storage_path || item.url || "",
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
        <img src={item.url ?? ""} alt={item.name ?? "Deliverable"} className="h-full w-full object-contain" />
      )}

      <a
        href={item.url ?? "#"}
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
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow transition-colors hover:bg-black/90"
        >
          ✕
        </button>
      )}
    </div>
  );
}
