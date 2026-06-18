"use client";

import { useActionState } from "react";
import {
  upsertCreatorProfile,
  type ProfileState,
} from "@/app/actions/profile";
import { NICHES } from "@/lib/niches";
import { GENDERS, COUNTRIES } from "@/lib/demographics";
import { ImageUpload } from "@/components/ImageUpload";
import { HandleInput } from "@/components/ui/PrefixedInput";
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
        <Niche defaultValue={profile?.niche ?? ""} />
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
        <HandleInput label="Instagram" name="instagram" defaultValue={profile?.instagram} />
        <HandleInput label="TikTok" name="tiktok" defaultValue={profile?.tiktok} />
        <Text label="Instagram followers" name="instagram_followers" type="number" defaultValue={profile?.instagram_followers != null ? String(profile.instagram_followers) : ""} placeholder="e.g. 12400" />
        <Text label="TikTok followers" name="tiktok_followers" type="number" defaultValue={profile?.tiktok_followers != null ? String(profile.tiktok_followers) : ""} placeholder="e.g. 8300" />
      </div>

      {/* Transparent per-service rates — leave blank for any you don't offer. */}
      <fieldset className="rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
          Your rates (£) — set at least one
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Text label="UGC (per video)" name="ugc_rate" type="number" defaultValue={profile?.ugc_rate != null ? String(profile.ugc_rate) : ""} placeholder="e.g. 250" />
          <Text label="Event Day (per day)" name="event_rate" type="number" defaultValue={profile?.event_rate != null ? String(profile.event_rate) : ""} placeholder="e.g. 600" />
          <Text label="B-Roll (per pack)" name="broll_rate" type="number" defaultValue={profile?.broll_rate != null ? String(profile.broll_rate) : ""} placeholder="e.g. 400" />
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">Bio</span>
        <textarea
          name="bio"
          rows={3}
          defaultValue={profile?.bio ?? ""}
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="availability"
          defaultChecked={profile?.availability ?? true}
          className="accent-[var(--accent)]"
        />
        <span className="text-sm text-[var(--foreground)]">
          Available for bookings
        </span>
      </label>

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

function Niche({ defaultValue }: { defaultValue: string }) {
  // Keep any legacy free-text value selectable so it isn't lost.
  const isKnown = (NICHES as readonly string[]).includes(defaultValue);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        Niche
      </span>
      <select
        name="niche"
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
      >
        <option value="">Select a niche…</option>
        {!isKnown && defaultValue && (
          <option value={defaultValue}>{defaultValue}</option>
        )}
        {NICHES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
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
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
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
  defaultValue,
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
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
      />
    </label>
  );
}
