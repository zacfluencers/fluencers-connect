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
