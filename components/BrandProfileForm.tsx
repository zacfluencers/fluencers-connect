"use client";

import { useActionState } from "react";
import {
  upsertBrandProfile,
  type BrandProfileState,
} from "@/app/actions/brandProfile";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ImageUpload";
import { HandleInput, UrlInput } from "@/components/ui/PrefixedInput";
import type { BrandProfile } from "@/lib/types";

/** Brand dashboard form: company details, media/links + the "looking for creators" toggle. */
export function BrandProfileForm({
  profile,
  userId,
  redirectTo,
  canList = true,
}: {
  profile: BrandProfile | null;
  userId: string;
  /** If set, the form navigates here after a successful save (e.g. onboarding). */
  redirectTo?: string;
  /** Whether the brand may list in the creator directory (subscribers only). */
  canList?: boolean;
}) {
  const [state, formAction, pending] = useActionState<BrandProfileState, FormData>(
    upsertBrandProfile,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      <Field label="Company logo" hint="Shown on your card. Falls back to your initial if empty.">
        <ImageUpload userId={userId} name="logo_url" defaultUrl={profile?.logo_url} label="Upload logo" />
      </Field>

      <Field label="Company name">
        <Input name="company_name" defaultValue={profile?.company_name ?? ""} required />
      </Field>

      <Field label="What you're looking for" hint="Tell creators about the work, vibe, and deliverables.">
        <Textarea name="about" rows={3} defaultValue={profile?.about ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UrlInput label="Website" name="website" defaultValue={profile?.website} />
        <HandleInput label="Instagram" name="instagram" defaultValue={profile?.instagram} />
        <HandleInput label="TikTok" name="tiktok" defaultValue={profile?.tiktok} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Budget min (£)">
          <Input
            name="budget_min"
            type="number"
            min="0"
            defaultValue={profile?.budget_min != null ? String(profile.budget_min) : ""}
            placeholder="e.g. 150"
          />
        </Field>
        <Field label="Budget max (£)">
          <Input
            name="budget_max"
            type="number"
            min="0"
            defaultValue={profile?.budget_max != null ? String(profile.budget_max) : ""}
            placeholder="e.g. 600"
          />
        </Field>
      </div>

      <label
        className={`flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-3 ${
          canList ? "" : "cursor-not-allowed opacity-60"
        }`}
      >
        <input
          type="checkbox"
          name="looking_for_creators"
          defaultChecked={canList && (profile?.looking_for_creators ?? false)}
          disabled={!canList}
          className="h-4 w-4 accent-[var(--accent-2)] disabled:cursor-not-allowed"
        />
        <span>
          <span className="block text-sm font-medium text-[var(--foreground)]">
            Looking for creators
          </span>
          <span className="block text-xs text-[var(--muted)]">
            {canList
              ? "Show your brand in the creator-facing directory so creators can reach out."
              : "Subscribe to list your brand in the creator directory and get messages."}
          </span>
        </span>
      </label>

      {state && "error" in state && (
        <p className="text-sm text-rose-300">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-300">Saved.</p>
      )}

      <Button type="submit" variant={redirectTo ? "primary" : "secondary"} disabled={pending}>
        {pending
          ? "Saving…"
          : redirectTo
            ? "Save & continue"
            : "Save brand profile"}
      </Button>
    </form>
  );
}
