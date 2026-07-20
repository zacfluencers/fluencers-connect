import "server-only";

/**
 * Transactional email via Resend's HTTP API (no SDK dependency).
 *
 * SERVER-ONLY. Best-effort: every function here degrades gracefully and never
 * throws — a failed email must never break the underlying action. If
 * RESEND_API_KEY is unset (e.g. local dev), sending simply no-ops.
 *
 * Resend is already the app's email provider (it powers Supabase Auth SMTP);
 * this reuses the same verified `fluencersgroup.com` domain for app-generated
 * notification emails. Create a Resend API key and set RESEND_API_KEY to enable.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Verified sender. Override with EMAIL_FROM if you want a friendlier address. */
const FROM = process.env.EMAIL_FROM || "Fluencers Connect <no-reply@fluencersgroup.com>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Send one email. Returns true on success, false on any failure (never throws). */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html, ...(text ? { text } : {}) }),
    });
    if (!res.ok) {
      // Don't log the body — it can echo the recipient address.
      console.error(`[email] Resend rejected the request (status ${res.status})`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Escape user-supplied text before dropping it into the HTML template. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface NotificationEmailInput {
  title: string;
  body?: string | null;
  /** Absolute URL to deep-link the recipient into the app. */
  url?: string | null;
}

/**
 * Branded, mobile-friendly HTML for a single notification. Uses table layout +
 * inline styles (the only thing email clients reliably render). Light background
 * for deliverability, with the brand's deep-purple accent on the CTA.
 */
export function renderNotificationEmail({ title, body, url }: NotificationEmailInput): {
  html: string;
  text: string;
} {
  const safeTitle = esc(title);
  const safeBody = body ? esc(body) : "";
  const cta = url
    ? `<tr><td style="padding:8px 0 4px;">
         <a href="${esc(url)}" style="display:inline-block;background:#3717b6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">View in Fluencers Connect</a>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f8;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece8f5;">
          <tr><td style="background:#0b0715;padding:18px 28px;">
            <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">Fluencers&nbsp;Connect</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:19px;font-weight:700;color:#141019;padding-bottom:${safeBody ? "8px" : "16px"};line-height:1.35;">${safeTitle}</td></tr>
              ${safeBody ? `<tr><td style="font-size:15px;color:#544f60;line-height:1.5;padding-bottom:18px;">${safeBody}</td></tr>` : ""}
              ${cta}
            </table>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #f0edf7;">
            <span style="font-size:12px;color:#9a94ac;line-height:1.5;">You're receiving this because you have an account on Fluencers Connect.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [title, body || "", url ? `\nView: ${url}` : ""].filter(Boolean).join("\n");
  return { html, text };
}

interface ProfileNudgeInput {
  /** "creator" gets the marketplace pitch; "brand" gets the hiring one. */
  role: "creator" | "brand";
  /** Absolute URL to the right profile editor. */
  url: string;
  /** Second and final nudge — shorter, and says it's the last one. */
  isFinal?: boolean;
}

/**
 * The "you signed up but never finished your profile" email.
 *
 * A lifecycle email rather than a notification: someone made an account and
 * then stopped, and until they save a profile they're invisible to the other
 * side of the marketplace. Deliberately short, concrete about what's missing,
 * and honest that it's one of at most two — nobody gets nagged indefinitely.
 */
export function renderProfileNudgeEmail({ role, url, isFinal = false }: ProfileNudgeInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isCreator = role === "creator";

  const subject = isFinal
    ? isCreator
      ? "Your Fluencers Connect profile is still empty"
      : "Finish your brand profile on Fluencers Connect"
    : isCreator
      ? "You're almost on Fluencers Connect"
      : "One step left on Fluencers Connect";

  const headline = isCreator
    ? "Brands can't find you yet"
    : "Creators can't see you yet";

  const lead = isCreator
    ? "You created an account, but your profile hasn't been saved — so you don't appear when brands browse for creators. It takes about two minutes."
    : "You created an account, but your brand profile hasn't been saved — so creators can't see who you are when you get in touch. It takes about two minutes.";

  const steps = isCreator
    ? [
        "Add a photo — profiles with one get looked at far more",
        "Connect your Instagram or TikTok so your follower numbers fill in automatically",
        "Set your rates for the work you'll take on",
      ]
    : [
        "Add your logo and a line about what your brand does",
        "Set the budget range you typically work with",
        "Say what kind of creators you're looking for",
      ];

  const closing = isFinal
    ? "This is the last reminder we'll send — your account stays open either way."
    : "";

  const stepsHtml = steps
    .map(
      (s) =>
        `<tr><td style="font-size:15px;color:#544f60;line-height:1.5;padding:0 0 8px 0;">
           <span style="color:#3717b6;font-weight:700;">&bull;</span>&nbsp;&nbsp;${esc(s)}
         </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f8;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece8f5;">
          <tr><td style="background:#0b0715;padding:18px 28px;">
            <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">Fluencers&nbsp;Connect</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:19px;font-weight:700;color:#141019;padding-bottom:8px;line-height:1.35;">${esc(headline)}</td></tr>
              <tr><td style="font-size:15px;color:#544f60;line-height:1.5;padding-bottom:18px;">${esc(lead)}</td></tr>
              ${stepsHtml}
              <tr><td style="padding:14px 0 4px;">
                <a href="${esc(url)}" style="display:inline-block;background:#3717b6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Finish my profile</a>
              </td></tr>
              ${
                closing
                  ? `<tr><td style="font-size:14px;color:#8b8598;line-height:1.5;padding-top:16px;">${esc(closing)}</td></tr>`
                  : ""
              }
            </table>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #f0edf7;">
            <span style="font-size:12px;color:#9a94ac;line-height:1.5;">You're receiving this because you started an account on Fluencers Connect and haven't finished setting it up. We'll only send this a couple of times.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    headline,
    "",
    lead,
    "",
    ...steps.map((s) => `- ${s}`),
    "",
    `Finish your profile: ${url}`,
    closing ? `\n${closing}` : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}
