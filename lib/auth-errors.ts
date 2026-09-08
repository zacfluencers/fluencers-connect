/**
 * Turns raw sign-in/sign-up errors into something a real person can act on.
 *
 * The bot check (Cloudflare Turnstile, via Supabase) sometimes rejects a token
 * even from a genuine visitor - most often when the page was opened inside an
 * "in-app" browser (the mini-browser built into Gmail, Instagram, Facebook or
 * WhatsApp), which blocks the cookies the check needs, or when the form sat
 * open long enough for the token to expire. Supabase surfaces this as messages
 * like "captcha protection: request disallowed (invalid-input-response)", which
 * means nothing to a signup coming off an email campaign.
 *
 * We map those to a plain retry message that also points them at a normal
 * browser, and leave every other error untouched.
 */
export function friendlyAuthError(message: string): string {
  if (/captcha|request disallowed|invalid-input|human/i.test(message)) {
    return "We couldn't confirm you're human. Please try again. If you opened this from an email or app, tap the menu and choose 'Open in browser' (Chrome or Safari), then try there.";
  }
  return message;
}
