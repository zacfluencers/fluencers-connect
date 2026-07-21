/**
 * Re-send signup confirmation emails — SERVER ONLY.
 *
 * Recovery for the 21 Jul invite wave, where two faults overlapped: Resend hit
 * its sending quota (mail arrived after the link had expired) and signUp()
 * sent people to the home page instead of the auth callback, so they landed
 * signed out. Both are fixed, but Supabase only ever sends that email once, so
 * the accounts left unconfirmed need a deliberate second attempt.
 *
 * One email per person, ever. `unconfirmed_signups()` (migration 0030) owns
 * the rules; this module only sends and records.
 *
 * Uses the service-role client, so callers MUST authorise the request first.
 */

import "server-only";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/stripe/server";

/**
 * Gap between sends. Supabase rate-limits its auth mail, and tripping that
 * would fail the rest of the batch - the slow loop is the point, not an
 * oversight.
 */
const SEND_GAP_MS = 1_200;

/** Ceiling per run, so one run can't overrun the function timeout. */
const MAX_PER_RUN = 100;

interface UnconfirmedSignup {
  user_id: string;
  email: string;
  role: "creator" | "brand";
}

export interface ResendRunResult {
  candidates: number;
  sent: number;
  failed: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send one round of confirmation resends.
 *
 * Safe to run daily: eligibility is "has never been resent", so once someone
 * has had their second chance they drop out permanently, and a repeat run
 * finds nobody.
 *
 * `dryRun` reports who would be emailed without sending or recording.
 */
export async function resendSignupConfirmations(
  opts: { dryRun?: boolean } = {},
): Promise<ResendRunResult> {
  if (!isAdminConfigured()) return { candidates: 0, sent: 0, failed: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("unconfirmed_signups", {
    max_age_hours: 336, // 14 days: older than that and a cold confirm is spam.
  });

  if (error) {
    console.error("[confirm-resend] couldn't load candidates:", error.message);
    return { candidates: 0, sent: 0, failed: 0 };
  }

  const all = (data ?? []) as UnconfirmedSignup[];
  const batch = all.slice(0, MAX_PER_RUN);
  if (opts.dryRun) return { candidates: all.length, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const [index, person] of batch.entries()) {
    if (index > 0) await sleep(SEND_GAP_MS);

    // Pass the redirect explicitly. Without it Supabase falls back to the
    // project's Site URL - the home page - which is the original bug: nothing
    // there exchanges the code, so they arrive signed out all over again.
    const next = person.role === "creator" ? "/dashboard/creator" : "/welcome";
    const { error: sendError } = await admin.auth.resend({
      type: "signup",
      email: person.email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (sendError) {
      console.error(
        `[confirm-resend] failed for ${person.user_id}:`,
        sendError.message,
      );
      failed++;
      continue;
    }

    // Record only after a successful send, so a provider outage means we retry
    // tomorrow rather than silently burning someone's one-and-only resend.
    const { error: recordError } = await admin
      .from("signup_confirmation_resends")
      .upsert({ user_id: person.user_id }, { onConflict: "user_id" });
    if (recordError) {
      // Worth shouting about: they've been emailed but we can't prove it, so
      // tomorrow's run would email them a second time.
      console.error(
        "[confirm-resend] sent but failed to record:",
        recordError.message,
      );
    }
    sent++;
  }

  return { candidates: all.length, sent, failed };
}
