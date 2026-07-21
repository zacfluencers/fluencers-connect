"use client";

import { useActionState, useState } from "react";
import {
  upsertCreatorProfile,
  type ProfileState,
} from "@/app/actions/profile";
import { NICHES } from "@/lib/niches";
import { GENDERS, COUNTRIES } from "@/lib/demographics";
import { ImageUpload } from "@/components/ImageUpload";
import { SocialFields } from "@/components/SocialFields";
import type { CreatorProfile } from "@/lib/types";

/** Lets a creator create/edit the marketplace profile that makes them bookable. */
export function CreatorProfileForm({
  profile,
  userId,
}: {
  profile: CreatorProfile | null;
  userId: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    upsertCreatorProfile,
    null,
  );
  // Held here, not inside <Niche>, because the secondary picker has to hide
  // whichever niche is currently primary.
  const [niche, setNiche] = useState(profile?.niche ?? "");

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          Profile photo
        </span>
        <ImageUpload
          userId={userId}
          name="profile_image"
          defaultUrl={profile?.profile_image}
          label="Upload photo"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Text label="Display name" name="name" defaultValue={profile?.name} required />
        <Niche value={niche} onChange={setNiche} />
        <Dropdown label="Gender" name="gender" defaultValue={profile?.gender ?? ""} placeholder="Prefer not to say">
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </Dropdown>
        <Text label="Age" name="age" type="number" defaultValue={profile?.age != null ? String(profile.age) : ""} placeholder="e.g. 27" />
        <Dropdown label="Country" name="country" defaultValue={profile?.country ?? ""} placeholder="Select a country…">
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Dropdown>
      </div>

      <SecondaryNiches
        primary={niche}
        defaultValues={profile?.secondary_niches ?? []}
      />

      <SocialFields
        creatorId={userId}
        defaultInstagram={profile?.instagram}
        defaultTiktok={profile?.tiktok}
        defaultIgFollowers={profile?.instagram_followers}
        defaultTtFollowers={profile?.tiktok_followers}
      />

      {/* Transparent per-service rates — leave blank for any you don't offer. */}
      <fieldset className="rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
          Your rates (£) - set at least one
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Text label="UGC (per video)" name="ugc_rate" type="number" defaultValue={profile?.ugc_rate != null ? String(profile.ugc_rate) : ""} placeholder="e.g. 250" />
          <Text label="Event Day (per day)" name="event_rate" type="number" defaultValue={profile?.event_rate != null ? String(profile.event_rate) : ""} placeholder="e.g. 600" />
          <Text label="B-Roll (per pack)" name="broll_rate" type="number" defaultValue={profile?.broll_rate != null ? String(profile.broll_rate) : ""} placeholder="e.g. 400" />
        </div>
      </fieldset>

      <Bio defaultValue={profile?.bio ?? ""} />

      <Availability defaultChecked={profile?.availability ?? true} />

      {state && "error" in state && (
        <p className="text-sm text-rose-300">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-300">Profile saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

// All fields below are CONTROLLED (driven by state) so React 19's automatic
// form-reset after a Server Action can't blank them on save.

const FIELD =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60";

function Niche({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Keep any legacy free-text value selectable so it isn't lost.
  const isKnown = (NICHES as readonly string[]).includes(value);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        Main niche
      </span>
      <select
        name="niche"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
        required
      >
        <option value="">Select a niche…</option>
        {!isKnown && value && <option value={value}>{value}</option>}
        {NICHES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-[var(--muted)]">
        This is the one shown on your card. Without it you won&apos;t show up in
        brand searches.
      </span>
    </label>
  );
}

/**
 * Extra categories a creator also fits.
 *
 * These widen who finds them in search without cluttering their card, which
 * only ever shows the main niche plus a count. Submitted as repeated hidden
 * inputs so the whole thing stays one plain form post.
 */
function SecondaryNiches({
  primary,
  defaultValues,
}: {
  primary: string;
  defaultValues: string[];
}) {
  const [picked, setPicked] = useState<string[]>(defaultValues);

  // If they promote a secondary niche to primary, drop it from here rather
  // than counting the same category twice.
  const selected = picked.filter((n) => n !== primary);

  return (
    <fieldset className="rounded-xl border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
        Also relevant for (optional)
      </legend>

      {selected.map((n) => (
        <input key={n} type="hidden" name="secondary_niches" value={n} />
      ))}

      <div className="flex flex-wrap gap-2">
        {NICHES.filter((n) => n !== primary).map((n) => {
          const on = selected.includes(n);
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setPicked((prev) =>
                  prev.includes(n)
                    ? prev.filter((x) => x !== n)
                    : [...prev, n],
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                on
                  ? "border-[var(--accent-2)] bg-[var(--accent-2)]/15 text-[var(--foreground)]"
                  : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--accent-2)]/50"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        {selected.length > 0 ? `${selected.length} chosen. ` : ""}
        Pick as many as genuinely fit - you&apos;ll show up in searches for all
        of them, and your card still shows only your main niche. Brands
        searching your main niche see you first, so there&apos;s no advantage in
        ticking ones you don&apos;t really cover.
      </p>
    </fieldset>
  );
}

function Dropdown({
  label,
  name,
  defaultValue,
  placeholder,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <select
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={FIELD}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </label>
  );
}

function Text({
  label,
  name,
  defaultValue = "",
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className={FIELD}
      />
    </label>
  );
}

function Bio({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">Bio</span>
      <textarea
        name="bio"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={FIELD}
      />
    </label>
  );
}

function Availability({ defaultChecked }: { defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name="availability"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="accent-[var(--accent)]"
      />
      <span className="text-sm text-[var(--foreground)]">
        Available for bookings
      </span>
    </label>
  );
}
