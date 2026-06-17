"use client";

import { useActionState } from "react";
import {
  upsertBrandProfile,
  type BrandProfileState,
} from "@/app/actions/brandProfile";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { BrandProfile } from "@/lib/types";

/** Brand dashboard form: company details + the "looking for creators" toggle. */
export function BrandProfileForm({ profile }: { profile: BrandProfile | null }) {
  const [state, formAction, pending] = useActionState<BrandProfileState, FormData>(
    upsertBrandProfile,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Company name">
        <Input name="company_name" defaultValue={profile?.company_name ?? ""} required />
      </Field>

      <Field label="What you're looking for" hint="Tell creators about the work, vibe, and deliverables.">
        <Textarea name="about" rows={3} defaultValue={profile?.about ?? ""} />
      </Field>

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

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-3">
        <input
          type="checkbox"
          name="looking_for_creators"
          defaultChecked={profile?.looking_for_creators ?? false}
          className="h-4 w-4 accent-[var(--accent-2)]"
        />
        <span>
          <span className="block text-sm font-medium text-[var(--foreground)]">
            Looking for creators
          </span>
          <span className="block text-xs text-[var(--muted)]">
            Show your brand in the creator-facing directory so creators can reach out.
          </span>
        </span>
      </label>

      {state && "error" in state && (
        <p className="text-sm text-rose-300">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-300">Saved.</p>
      )}

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save brand profile"}
      </Button>
    </form>
  );
}
