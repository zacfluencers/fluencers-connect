"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  addPortfolioItem,
  deletePortfolioItem,
  reorderPortfolioItems,
} from "@/app/actions/portfolio";
import { uploadToBucketWithProgress } from "@/lib/upload";
import type { PortfolioItem } from "@/lib/types";

// Must stay at or below the smaller of the bucket limit and the project-wide
// storage limit in the Supabase dashboard. See 0027_raise_upload_limits.sql.
const MAX_MB = 500;

/** Six-dot "grip" icon used on the drag handle. */
function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <circle cx="7" cy="4.5" r="1.5" />
      <circle cx="13" cy="4.5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15.5" r="1.5" />
      <circle cx="13" cy="15.5" r="1.5" />
    </svg>
  );
}

/**
 * A single draggable portfolio tile. Only the small corner handle starts a
 * drag, so the video's own controls and the delete button keep working
 * normally - tapping the video plays it, dragging the handle reorders.
 */
function SortableTile({
  item,
  onRemove,
  removing,
}: {
  item: PortfolioItem;
  onRemove: () => void;
  removing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-[9/16] select-none overflow-hidden rounded-xl bg-black ${
        isDragging
          ? "shadow-2xl ring-2 ring-[var(--accent-2)]"
          : "shadow-sm"
      }`}
    >
      <video
        // #t=0.1 makes the browser render the first frame as the poster
        // instead of showing a black box before playback.
        src={`${item.image_url}#t=0.1`}
        className="h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
        draggable={false}
      />

      {/* Drag handle - the only thing that starts a reorder. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="absolute left-3 top-2 z-10 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-full bg-black/70 text-white shadow transition-colors hover:bg-black/90 active:cursor-grabbing"
      >
        <GripIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label="Delete video"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow transition-colors hover:bg-black/90"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Upload + manage portfolio videos. Files go to Supabase Storage; rows are
 * recorded via server actions. Display is locked to a 9:16 vertical frame.
 * Tiles can be dragged (by the corner handle) to reorder; the new order saves
 * itself and is what shows on the public profile.
 */
export function PortfolioManager({
  userId,
  items: initialItems,
}: {
  userId: string;
  items: PortfolioItem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Keep local order in sync with the server whenever it re-sends the list
  // (after an upload or delete). Reordering saves without a refresh, so this
  // never clobbers a drag the user just made.
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Let the "Saved" tick fade on its own.
  useEffect(() => {
    if (saveState !== "saved") return;
    const t = setTimeout(() => setSaveState("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  const sensors = useSensors(
    // A little movement/hold is required before a drag begins, so a plain
    // click on the handle (or a tap that's really a scroll) isn't hijacked.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function persistOrder(next: PortfolioItem[]) {
    setSaveState("saving");
    startSaving(async () => {
      const res = await reorderPortfolioItems(next.map((i) => i.id));
      if ("error" in res) {
        setSaveState("error");
        setError(res.error);
      } else {
        setError(null);
        setSaveState("saved");
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next); // optimistic - the tiles move instantly
    persistOrder(next);
  }

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
    // Drop it from view immediately, then confirm with the server.
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deletePortfolioItem(id);
      if ("error" in result) {
        setError(result.error);
        router.refresh(); // put it back if the delete didn't take
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {items.length > 1 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <GripIcon className="h-3.5 w-3.5 shrink-0" />
            Drag a video by its handle to reorder. Saves automatically.
          </p>
          <span aria-live="polite" className="text-xs">
            {saveState === "saving" && (
              <span className="text-[var(--muted)]">Saving order…</span>
            )}
            {saveState === "saved" && (
              <span className="text-emerald-400">✓ Order saved</span>
            )}
            {saveState === "error" && (
              <span className="text-rose-300">Couldn&apos;t save order</span>
            )}
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            {items.map((item) => (
              <SortableTile
                key={item.id}
                item={item}
                onRemove={() => remove(item.id)}
                removing={pending}
              />
            ))}
          </SortableContext>

          {/* Upload tile (matches the 9:16 frame). Not draggable. */}
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
      </DndContext>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">
        Vertical video (9:16), MP4 or MOV, up to {MAX_MB}MB each. Shown on your
        public profile. On mobile data, large clips take a while - wifi is
        steadier for anything over a minute long.
      </p>
    </div>
  );
}
