/**
 * "Finish your profile" nudge emails — SERVER ONLY.
 *
 * A third of signups create an account and stop before saving a profile. Until
 * they do, they're invisible: a creator doesn't appear in the marketplace, a
 * brand has nothing for creators to look at. This nudges them back.
 *
 * Deliberately gentle: one reminder a week for up to about three months, and
 * the moment they save a profile they drop out of the list and hear nothing
 * more. `stalled_profile_signups()` (see migration 0026) decides who qualifies;
 * this module only sends and records.
 *
 * Uses the service-role client, so callers MUST authorise the request first.
 */

import "server-only";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/stripe/server";
import { isEmailConfigured, renderProfileNudgeEmail, sendEmail } from "@/lib/email";

/**
 * Wait this long after signup before the first nudge.
 *
 * Was 48h, which suited organic signups. Invited creators behave differently:
 * the 21 Jul wave saw 221 signups between 13:00 and 21:00, and at 48h the
 * job would have skipped every one of them the next morning. 12h makes this a
 * genuine next-morning reminder while they still remember signing up.
 *
 * Anyone who finishes their profile overnight is excluded by the SQL at send
 * time, so a shorter window costs nothing.
 */
const FIRST_NUDGE_AFTER_HOURS = 12;

/**
 * How many reminders in total, ever - the quiet backstop.
 *
 * We remind weekly until they finish their profile (the SQL drops them the
 * instant they do), but not forever: an account that never responds gets about
 * three months of nudges and then we stop, so a dead signup isn't nagged
 * indefinitely - and, just as importantly, endless mail to non-openers can't
 * drag down the reputation of the domain that also sends our confirmation,
 * reset and booking emails. At one a week, 13 sends ≈ three months.
 */
const MAX_NUDGES = 13;

/**
 * Gap between sends. Resend rate-limits at roughly 2 requests a second and
 * rejects the overflow. This job was written for an audience of 7 and sent as
 * fast as it could; the 21 Jul invite wave pushed one run to 88 recipients,
 * where an unthrottled loop would have had most of them refused.
 */
const SEND_GAP_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimum gap between one reminder and the next: a week. */
const REPEAT_AFTER_HOURS = 168;

/**
 * Most emails to send in a single run - a deliverability guard.
 *
 * A backlog (or a burst of signups, like the 21 Jul invite wave) shouldn't hit
 * the sending domain with one big cold blast; low-engagement spikes are what
 * dent reputation, and that domain also carries our confirmation, reset and
 * booking mail. Runs daily, so a backlog drains ~50 a morning over a few days.
 * The SQL orders by signup date, so the longest-waiting accounts go first, and
 * anything over the cap simply waits for tomorrow - never dropped.
 */
const MAX_PER_RUN = 50;

interface StalledSignup {
  user_id: string;
  email: string;
  role: "creator" | "brand";
  sent_count: number;
}

/** Where each role finishes setting up. */
function profileUrl(role: "creator" | "brand"): string {
  return `${getBaseUrl()}/dashboard/${role}`;
}

export interface NudgeRunResult {
  /** How many people qualified this run. */
  candidates: number;
  /** How many emails actually went out. */
  sent: number;
}

/**
 * Send one round of nudges. Safe to run daily: the SQL side enforces the age,
 * cap and spacing rules, so a daily run mostly finds nobody. When it does find
 * a backlog, at most MAX_PER_RUN go out per run and the rest wait for tomorrow.
 *
 * `dryRun` resolves who *would* be emailed without sending or recording — used
 * to sanity-check the audience before turning the job loose. Note a dry run
 * reports the full qualifying count, not the per-run-capped batch.
 */
export async function sendProfileNudges(
  opts: { dryRun?: boolean } = {},
): Promise<NudgeRunResult> {
  if (!isAdminConfigured()) return { candidates: 0, sent: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("stalled_profile_signups", {
    min_age_hours: FIRST_NUDGE_AFTER_HOURS,
    max_nudges: MAX_NUDGES,
    repeat_after_hours: REPEAT_AFTER_HOURS,
  });

  if (error) {
    console.error("[nudge] couldn't load stalled signups:", error.message);
    return { candidates: 0, sent: 0 };
  }

  const candidates = (data ?? []) as StalledSignup[];
  if (opts.dryRun || !isEmailConfigured()) {
    return { candidates: candidates.length, sent: 0 };
  }

  // Send only up to the daily cap; the rest wait for tomorrow's run.
  const batch = candidates.slice(0, MAX_PER_RUN);

  let sent = 0;
  for (const [index, person] of batch.entries()) {
    if (index > 0) await sleep(SEND_GAP_MS);

    const nudgeNumber = person.sent_count + 1;
    const { subject, html, text } = renderProfileNudgeEmail({
      role: person.role,
      url: profileUrl(person.role),
      // Alternate the wording week to week (0-based: first send = variant 0).
      variant: person.sent_count,
    });

    const ok = await sendEmail({ to: person.email, subject, html, text });
    if (!ok) continue;

    // Record only after a successful send, so a provider outage means we retry
    // tomorrow rather than silently burning someone's one-and-only nudge.
    const now = new Date().toISOString();
    const { error: recordError } = await admin.from("profile_nudges").upsert(
      {
        user_id: person.user_id,
        sent_count: nudgeNumber,
        first_sent_at: person.sent_count === 0 ? now : undefined,
        last_sent_at: now,
      },
      { onConflict: "user_id" },
    );
    if (recordError) {
      // Worth shouting about: we've emailed them but can't prove it, so the
      // next run would email them again.
      console.error("[nudge] sent but failed to record:", recordError.message);
    }
    sent++;
  }

  return { candidates: candidates.length, sent };
}

/**
 * Send a sample of the nudge email - one creator version, one brand version -
 * to a single address, so the wording and layout can be checked in a real
 * inbox before anyone else receives them. Records nothing and touches nobody
 * else's state.
 */
export async function sendProfileNudgePreview(to: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const creator = renderProfileNudgeEmail({ role: "creator", url: profileUrl("creator") });
  const brand = renderProfileNudgeEmail({ role: "brand", url: profileUrl("brand") });

  const a = await sendEmail({
    to,
    subject: `[Preview - creator] ${creator.subject}`,
    html: creator.html,
    text: creator.text,
  });
  const b = await sendEmail({
    to,
    subject: `[Preview - brand] ${brand.subject}`,
    html: brand.html,
    text: brand.text,
  });
  return a && b;
}
