"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadToBucketWithProgress } from "@/lib/upload";
import {
  saveBookingBrief,
  recordBriefAsset,
  deleteBriefAsset,
} from "@/app/actions/brief";
import type { BookingAsset, BookingBrief, ProductMode } from "@/lib/types";

const MAX_MB = 100;

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Multiple platforms", "Other"];

/** All free-text fields, grouped — drives both the form and the summary. */
type FieldType = "input" | "textarea" | "select" | "date";
interface FieldDef {
  key: keyof BriefValues;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  rows?: number;
}
interface SectionDef {
  title: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "Campaign details",
    fields: [
      { key: "campaign_name", label: "Campaign name", type: "input", placeholder: "Summer skincare launch" },
      { key: "objective", label: "Objective", type: "textarea", placeholder: "What should this campaign achieve?" },
      { key: "target_audience", label: "Target audience", type: "input", placeholder: "Women 25–34, skincare-curious" },
    ],
  },
  {
    title: "Content",
    fields: [
      { key: "platform", label: "Platform", type: "select" },
      { key: "deliverables", label: "Deliverables", type: "textarea", placeholder: "e.g. 3× 30s TikToks + 5 photos" },
      { key: "creative_brief", label: "Creative brief", type: "textarea", rows: 5, placeholder: "The story, tone and direction you have in mind…" },
      { key: "talking_points", label: "Talking points", type: "textarea", placeholder: "Key messages to hit" },
      { key: "cta", label: "Call to action", type: "input", placeholder: "e.g. “Use code GLOW20 — link in bio”" },
    ],
  },
  {
    title: "Requirements",
    fields: [
      { key: "must_include", label: "Must include", type: "textarea", placeholder: "Required hashtags, mentions, claims, disclosures" },
      { key: "avoid", label: "Avoid", type: "textarea", placeholder: "Anything off-limits — competitors, phrases, settings" },
      { key: "deadline", label: "Deadline", type: "date" },
    ],
  },
  {
    title: "Commercial",
    fields: [
      { key: "payment", label: "Payment terms", type: "input", hint: "The price is already set and held in escrow — add any extra notes here.", placeholder: "e.g. bonus on 100k+ views" },
      { key: "usage_rights", label: "Usage rights", type: "textarea", placeholder: "Where and for how long can the brand use this content?" },
    ],
  },
];

type BriefValues = {
  campaign_name: string;
  objective: string;
  target_audience: string;
  platform: string;
  deliverables: string;
  creative_brief: string;
  talking_points: string;
  cta: string;
  must_include: string;
  avoid: string;
  deadline: string;
  payment: string;
  usage_rights: string;
  product_mode: ProductMode;
  shipping_tracking: string;
  product_link: string;
  discount_code: string;
};

function valuesFrom(brief: BookingBrief | null): BriefValues {
  return {
    campaign_name: brief?.campaign_name ?? "",
    objective: brief?.objective ?? "",
    target_audience: brief?.target_audience ?? "",
    platform: brief?.platform ?? "",
    deliverables: brief?.deliverables ?? "",
    creative_brief: brief?.creative_brief ?? "",
    talking_points: brief?.talking_points ?? "",
    cta: brief?.cta ?? "",
    must_include: brief?.must_include ?? "",
    avoid: brief?.avoid ?? "",
    deadline: brief?.deadline ?? "",
    payment: brief?.payment ?? "",
    usage_rights: brief?.usage_rights ?? "",
    product_mode: brief?.product_mode ?? "none",
    shipping_tracking: brief?.shipping_tracking ?? "",
    product_link: brief?.product_link ?? "",
    discount_code: brief?.discount_code ?? "",
  };
}

export function BookingBrief({
  bookingId,
  userId,
  role,
  brief,
  assets,
}: {
  bookingId: string;
  userId: string;
  role: "brand" | "creator";
  brief: BookingBrief | null;
  assets: BookingAsset[];
}) {
  const isBrand = role === "brand";
  const hasContent = useMemo(() => briefHasContent(brief, assets), [brief, assets]);
  // Brands start in edit mode when there's nothing yet (the post-booking nudge).
  const [editing, setEditing] = useState(isBrand && !hasContent);

  if (isBrand && editing) {
    return (
      <BriefForm
        bookingId={bookingId}
        userId={userId}
        brief={brief}
        assets={assets}
        onClose={() => setEditing(false)}
        canCancel={hasContent}
      />
    );
  }

  return (
    <BriefSummary
      brief={brief}
      assets={assets}
      isBrand={isBrand}
      hasContent={hasContent}
      onEdit={() => setEditing(true)}
    />
  );
}

function briefHasContent(brief: BookingBrief | null, assets: BookingAsset[]) {
  if (assets.length > 0) return true;
  if (!brief) return false;
  return Object.entries(brief).some(
    ([k, v]) =>
      !["booking_id", "updated_at", "product_mode"].includes(k) &&
      typeof v === "string" &&
      v.trim() !== "",
  ) || brief.product_mode !== "none";
}

/* -------------------------------------------------------------- Read-only view */

function BriefSummary({
  brief,
  assets,
  isBrand,
  hasContent,
  onEdit,
}: {
  brief: BookingBrief | null;
  assets: BookingAsset[];
  isBrand: boolean;
  hasContent: boolean;
  onEdit: () => void;
}) {
  if (!hasContent) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center">
        <p className="text-sm text-[var(--muted)]">
          {isBrand
            ? "No brief yet. Add campaign details, deliverables and references so your creator knows exactly what to make."
            : "The brand hasn’t added a brief yet — you’ll be notified when they do."}
        </p>
        {isBrand && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onEdit}>
            Add brief
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const filled = section.fields.filter((f) => (brief?.[f.key] ?? "") !== "");
        if (filled.length === 0) return null;
        return (
          <div key={section.title}>
            <h3 className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
              {section.title}
            </h3>
            <dl className="mt-3 space-y-3">
              {filled.map((f) => (
                <div key={f.key}>
                  <dt className="text-sm text-[var(--muted)]">{f.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                    {f.key === "deadline"
                      ? formatDate(String(brief?.[f.key]))
                      : String(brief?.[f.key])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      <ProductSummary brief={brief} />

      {assets.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
            Reference files
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {assets.map((a) => (
              <AssetTile key={a.id} asset={a} />
            ))}
          </div>
        </div>
      )}

      {isBrand && (
        <div className="border-t border-[var(--border)] pt-4">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit brief
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductSummary({ brief }: { brief: BookingBrief | null }) {
  if (!brief || brief.product_mode === "none") return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
        Product
      </h3>
      <dl className="mt-3 space-y-3">
        {brief.product_mode === "ship" ? (
          <div>
            <dt className="text-sm text-[var(--muted)]">Brand is shipping the product</dt>
            <dd className="mt-0.5 text-[var(--foreground)]">
              {brief.shipping_tracking
                ? `Tracking: ${brief.shipping_tracking}`
                : "Tracking to follow."}
            </dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="text-sm text-[var(--muted)]">Order it yourself</dt>
              <dd className="mt-0.5 break-words text-[var(--foreground)]">
                {brief.product_link ? (
                  <a
                    href={brief.product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-2)] underline underline-offset-4"
                  >
                    {brief.product_link}
                  </a>
                ) : (
                  "Product link to follow."
                )}
              </dd>
            </div>
            {brief.discount_code && (
              <div>
                <dt className="text-sm text-[var(--muted)]">Discount code</dt>
                <dd className="mt-0.5 font-mono text-[var(--foreground)]">
                  {brief.discount_code}
                </dd>
              </div>
            )}
          </>
        )}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ Edit form */

function BriefForm({
  bookingId,
  userId,
  brief,
  assets,
  onClose,
  canCancel,
}: {
  bookingId: string;
  userId: string;
  brief: BookingBrief | null;
  assets: BookingAsset[];
  onClose: () => void;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<BriefValues>(() => valuesFrom(brief));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BriefValues>(key: K, val: BriefValues[K]) =>
    setV((prev) => ({ ...prev, [key]: val }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    startTransition(async () => {
      const result = await saveBookingBrief(bookingId, fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      {SECTIONS.map((section) => (
        <fieldset key={section.title} className="space-y-4">
          <legend className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
            {section.title}
          </legend>
          {section.fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === "textarea" ? (
                <Textarea
                  name={f.key}
                  rows={f.rows ?? 2}
                  placeholder={f.placeholder}
                  value={v[f.key] as string}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : f.type === "select" ? (
                <Select
                  name={f.key}
                  value={v[f.key] as string}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={f.type === "date" ? "date" : "text"}
                  name={f.key}
                  placeholder={f.placeholder}
                  value={v[f.key] as string}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </fieldset>
      ))}

      {/* Product logistics */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
          Product
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              ["none", "No product"],
              ["ship", "I’ll ship it"],
              ["order", "Creator orders it"],
            ] as [ProductMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => set("product_mode", mode)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                v.product_mode === mode
                  ? "border-[var(--accent-2)] bg-[var(--accent-2)]/10 text-[var(--foreground)]"
                  : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {v.product_mode === "ship" && (
          <Field
            label="Shipping tracking"
            hint="Add the tracking number once you’ve sent the product."
          >
            <Input
              name="shipping_tracking"
              placeholder="e.g. AB123456789GB"
              value={v.shipping_tracking}
              onChange={(e) => set("shipping_tracking", e.target.value)}
            />
          </Field>
        )}

        {v.product_mode === "order" && (
          <div className="space-y-4">
            <Field label="Product link" hint="Where the creator orders the product.">
              <Input
                type="url"
                name="product_link"
                placeholder="https://yourstore.com/product"
                value={v.product_link}
                onChange={(e) => set("product_link", e.target.value)}
              />
            </Field>
            <Field
              label="Discount code"
              hint="A 100% off code so the creator pays nothing at checkout."
            >
              <Input
                name="discount_code"
                placeholder="CREATOR100"
                value={v.discount_code}
                onChange={(e) => set("discount_code", e.target.value)}
              />
            </Field>
          </div>
        )}
      </fieldset>

      {/* Reference files */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-[var(--accent-2)]">
          Reference files
        </legend>
        <AssetUploader bookingId={bookingId} userId={userId} assets={assets} />
      </fieldset>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex items-center gap-3 border-t border-[var(--border)] pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save brief"}
        </Button>
        {canCancel && (
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- Asset upload */

function AssetUploader({
  bookingId,
  userId,
  assets,
}: {
  bookingId: string;
  userId: string;
  assets: BookingAsset[];
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
          bucket: "briefs",
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
        } = supabase.storage.from("briefs").getPublicUrl(path);

        const result = await recordBriefAsset({
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
      const result = await deleteBriefAsset(id);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {assets.length > 0 && (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {assets.map((a) => (
            <AssetTile key={a.id} asset={a} onRemove={() => remove(a.id)} disabled={pending} />
          ))}
        </div>
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--muted)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]">
        <input
          type="file"
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
            <span>Upload assets</span>
            <span className="text-xs">Images, decks, example clips — up to {MAX_MB}MB each.</span>
          </>
        )}
      </label>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function AssetTile({
  asset,
  onRemove,
  disabled,
}: {
  asset: BookingAsset;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isImage = /\.(png|jpe?g|gif|webp|avif)$/i.test(asset.url);
  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.name ?? "Reference"}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          </svg>
        </span>
      )}
      <a
        href={asset.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <span className="block truncate text-sm text-[var(--foreground)]">
          {asset.name ?? "Reference file"}
        </span>
        <span className="block text-xs text-[var(--muted)]">{formatSize(asset.size)}</span>
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove file"
          className="shrink-0 rounded-lg px-2 py-1 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-rose-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  // value is a plain YYYY-MM-DD; render it without timezone surprises.
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
