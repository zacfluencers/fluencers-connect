import "server-only";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { licenceStatus, LICENCE_WARNING_DAYS } from "@/lib/licence";
import { serviceLabel } from "@/lib/services";

/**
 * Tell both sides when a whitelisting licence is about to end, and again when
 * it has.
 *
 * Without this the end date is a row in a table nobody reads. The brand keeps
 * spending on ads it no longer has the right to run, and the creator has no
 * idea when they can withdraw partner access - which is the situation the
 * platform would then be asked to arbitrate.
 *
 * Both parties are told, deliberately. Only telling the brand leaves the
 * creator trusting them to stop; only telling the creator makes the brand look
 * like they overran when nobody warned them.
 */

interface Result {
  ending: number;
  ended: number;
  dryRun: boolean;
}

/** A booking with a licence, plus the names each side needs to see. */
type Row = {
  id: string;
  brand_id: string;
  creator_id: string;
  service_type: string | null;
  licence_ends_at: string;
};

export async function sendLicenceReminders(
  opts: { dryRun?: boolean; now?: Date } = {},
): Promise<Result> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.now ?? new Date();
  if (!isAdminConfigured()) return { ending: 0, ended: 0, dryRun };

  const admin = createAdminClient();
  const cols = "id, brand_id, creator_id, service_type, licence_ends_at";

  const horizon = new Date(
    now.getTime() + LICENCE_WARNING_DAYS * 24 * 60 * 60 * 1000,
  );

  const [{ data: ending }, { data: ended }] = await Promise.all([
    admin
      .from("bookings")
      .select(cols)
      .not("licence_ends_at", "is", null)
      .gt("licence_ends_at", now.toISOString())
      .lte("licence_ends_at", horizon.toISOString())
      .is("licence_ending_notified_at", null),
    admin
      .from("bookings")
      .select(cols)
      .not("licence_ends_at", "is", null)
      .lte("licence_ends_at", now.toISOString())
      .is("licence_ended_notified_at", null),
  ]);

  const endingRows = (ending ?? []) as Row[];
  const endedRows = (ended ?? []) as Row[];

  if (dryRun) {
    return { ending: endingRows.length, ended: endedRows.length, dryRun };
  }

  for (const row of endingRows) {
    await warn(admin, row, now);
    await admin
      .from("bookings")
      .update({ licence_ending_notified_at: now.toISOString() })
      .eq("id", row.id);
  }

  for (const row of endedRows) {
    await expired(admin, row);
    await admin
      .from("bookings")
      .update({ licence_ended_notified_at: now.toISOString() })
      .eq("id", row.id);
  }

  return { ending: endingRows.length, ended: endedRows.length, dryRun };
}

type Admin = ReturnType<typeof createAdminClient>;

/** Who the other side is, so each message names a person rather than "a party". */
async function parties(admin: Admin, row: Row) {
  const [brand, creator] = await Promise.all([
    admin
      .from("brand_profiles")
      .select("company_name")
      .eq("user_id", row.brand_id)
      .maybeSingle(),
    admin
      .from("creator_profiles")
      .select("name")
      .eq("user_id", row.creator_id)
      .maybeSingle(),
  ]);
  return {
    brandName: brand.data?.company_name ?? "The brand",
    creatorName: creator.data?.name ?? "The creator",
    service: serviceLabel(row.service_type) ?? "This booking",
  };
}

async function warn(admin: Admin, row: Row, now: Date) {
  const { brandName, creatorName } = await parties(admin, row);
  const { days } = licenceStatus(new Date(row.licence_ends_at), now);
  const when = formatDate(row.licence_ends_at);
  const inDays = days === 1 ? "tomorrow" : `in ${days} days`;

  await notify(admin, {
    userId: row.brand_id,
    type: "booking_update",
    title: `Your whitelisting rights end ${inDays}`,
    body: `Ads running from ${creatorName}'s handle need to stop on ${when}. Renew with them if you'd like to keep going.`,
    link: `/bookings/${row.id}`,
  });

  await notify(admin, {
    userId: row.creator_id,
    type: "booking_update",
    title: `${brandName}'s whitelisting ends ${inDays}`,
    body: `Their ad rights run out on ${when}. After that you can remove them as an approved partner in Instagram.`,
    link: `/bookings/${row.id}`,
  });
}

async function expired(admin: Admin, row: Row) {
  const { brandName, creatorName } = await parties(admin, row);
  const when = formatDate(row.licence_ends_at);

  await notify(admin, {
    userId: row.brand_id,
    type: "booking_update",
    title: "Your whitelisting rights have ended",
    body: `The three months ran out on ${when}. Please stop any ads running from ${creatorName}'s handle, or book them again to continue.`,
    link: `/bookings/${row.id}`,
  });

  await notify(admin, {
    userId: row.creator_id,
    type: "booking_update",
    title: `Whitelisting for ${brandName} has ended`,
    body: `Their three months ended on ${when}. You can now remove them as an approved partner in Instagram.`,
    link: `/bookings/${row.id}`,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
}
