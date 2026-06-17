"use client";

import { useActionState } from "react";
import {
  upsertCreatorProfile,
  type ProfileState,
} from "@/app/actions/profile";
import { NICHES } from "@/lib/niches";
import type { CreatorProfile } from "@/lib/types";

/** Lets a creator create/edit the marketplace profile that makes them bookable. */
export function CreatorProfileForm({
  profile,
}: {
  profile: CreatorProfile | null;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    upsertCreatorProfile,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Text label="Display name" name="name" defaultValue={profile?.name} required />
        <Niche defaultValue={profile?.niche ?? ""} />
        <Text label="Instagram" name="instagram" defaultValue={profile?.instagram ?? ""} placeholder="@handle" />
        <Text label="TikTok" name="tiktok" defaultValue={profile?.tiktok ?? ""} placeholder="@handle" />
        <Text label="Instagram followers" name="instagram_followers" type="number" defaultValue={profile?.instagram_followers != null ? String(profile.instagram_followers) : ""} placeholder="e.g. 12400" />
        <Text label="TikTok followers" name="tiktok_followers" type="number" defaultValue={profile?.tiktok_followers != null ? String(profile.tiktok_followers) : ""} placeholder="e.g. 8300" />
        <Text label="Price per job (£)" name="price" type="number" defaultValue={profile ? String(profile.price) : ""} required />
        <Text label="Profile image URL" name="profile_image" defaultValue={profile?.profile_image ?? ""} placeholder="https://…" />
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">Bio</span>
        <textarea
          name="bio"
          rows={3}
          defaultValue={profile?.bio ?? ""}
          className="w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/40"
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
        <p className="text-sm text-[var(--accent)]">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-600">Profile saved.</p>
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
        className="w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/40"
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
        className="w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/40"
      />
    </label>
  );
}
