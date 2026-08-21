/**
 * Signup-time bot/abuse guard — pure, no I/O.
 *
 * A trickle of automated junk signups started ~15 Aug 2026: accounts that sign
 * up once, never come back, and never make a profile. Two fingerprints stood
 * out, and this catches both at the door so a fake account is never created:
 *
 *  1. Carrier text-message gateways ("2318812474@vtext.com"). These aren't
 *     inboxes at all - they turn an email into an SMS to a phone number, so a
 *     real creator would never sign up with one, and mailing them is useless.
 *
 *  2. Gmail "dot-scatter" ("ja.ip.a.l.s.ing.h10.2.3@gmail.com"). Gmail ignores
 *     dots, so one inbox can mint endless "unique" addresses by sprinkling them
 *     in. We saw the same inbox register three times in 90 minutes this way. A
 *     real person writes "jane.doe" (one or two dots); a machine writes noise.
 *
 * Deliberately conservative: a normal address - including "first.middle.last"
 * or a "+tag" - always passes. This is a cheap first filter, not a substitute
 * for a proper bot check (CAPTCHA) on the form; see SITE.md.
 */

/**
 * Phone-to-email (SMS/MMS) carrier gateways. Mailing one sends a text to a
 * stranger's phone, so no genuine signup uses them. US + UK majors.
 */
const CARRIER_GATEWAY_DOMAINS = new Set([
  "vtext.com", // Verizon SMS
  "vzwpix.com", // Verizon MMS
  "txt.att.net", // AT&T SMS
  "mms.att.net", // AT&T MMS
  "tmomail.net", // T-Mobile
  "messaging.sprintpcs.com", // Sprint
  "pm.sprint.com", // Sprint
  "msg.fi.google.com", // Google Fi
  "mailmymobile.net",
  "email.uscc.net", // US Cellular
  "sms.mtnsms.com",
  "mmsemail.o2.co.uk", // O2 UK
  "mms.ee.co.uk", // EE UK
  "sms.three.co.uk", // Three UK
]);

/** Split an address once, lower-casing the domain but keeping the local case. */
function split(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  return {
    local: trimmed.slice(0, at),
    domain: trimmed.slice(at + 1).toLowerCase(),
  };
}

/** True when the address is a phone-number-to-text gateway, not a real inbox. */
export function isCarrierGateway(email: string): boolean {
  const parts = split(email);
  return parts ? CARRIER_GATEWAY_DOMAINS.has(parts.domain) : false;
}

/**
 * True when a Gmail/Googlemail address shows the machine "dot-scatter" pattern.
 *
 * Two signals, either of which is enough:
 *  - 4+ dots in the local part (real names top out around two), or
 *  - 3+ single-character segments between dots ("m.a.p7.875.7"), which is the
 *    scatter fingerprint and essentially never happens in a real name.
 *
 * Only Gmail/Googlemail, because only there do dots collapse to one inbox.
 */
export function looksLikeGmailDotScatter(email: string): boolean {
  const parts = split(email);
  if (!parts) return false;
  if (parts.domain !== "gmail.com" && parts.domain !== "googlemail.com") {
    return false;
  }

  // Ignore a "+tag"; it doesn't affect the dot-scatter judgement.
  const local = parts.local.split("+")[0];
  const segments = local.split(".");
  const dotCount = segments.length - 1;
  const singleCharSegments = segments.filter((s) => s.length === 1).length;

  return dotCount >= 4 || singleCharSegments >= 3;
}

export interface SignupAbuseResult {
  /** False when we're confident this is an automated/junk signup. */
  ok: boolean;
  /** A short, user-facing reason when we block. */
  reason?: string;
}

/**
 * The one call the signup action makes. Blocks the two known bot fingerprints
 * and passes everything else through untouched.
 */
export function checkSignupAbuse(email: string): SignupAbuseResult {
  if (isCarrierGateway(email)) {
    return {
      ok: false,
      reason:
        "Please sign up with a normal email address, not a text-message number.",
    };
  }
  if (looksLikeGmailDotScatter(email)) {
    return {
      ok: false,
      reason: "That email address doesn't look right - please check it.",
    };
  }
  return { ok: true };
}
