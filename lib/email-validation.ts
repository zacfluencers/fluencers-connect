/**
 * Signup-time email sanity checks — pure, no I/O.
 *
 * Two cheap guards that run before we create an account:
 *  - format: is it shaped like an email at all?
 *  - typo:   does the domain look like a fat-finger of a popular one
 *            ("gmial.com" -> "gmail.com"), and can we offer the fix?
 *
 * Neither of these can prove an address is really the person's — only a
 * confirmation click does that. They just stop the obvious mistakes at the
 * door so nobody ends up with an account on an address they can never read.
 * The live "can this domain actually receive mail?" check needs a DNS lookup,
 * so it lives in email-domain.ts rather than here.
 */

// Pragmatic, not RFC-exhaustive: exactly one @, a dotted domain, a 2+ char
// TLD, and no spaces. Deliberately stricter than the browser's type="email"
// so the server never trusts a hand-crafted request.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** The mail domains our users actually sign up with, for near-miss matching. */
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "live.co.uk",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "btinternet.com",
];

/**
 * High-confidence corrections. These are unambiguous misspellings that a
 * typo-squatter may have registered, so DNS can still resolve them — we correct
 * them even when the domain technically "works".
 */
const KNOWN_DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.con": "icloud.com",
  "iclould.com": "icloud.com",
  "iclod.com": "icloud.com",
};

/** Split an address once, keeping the local part's original case. */
function splitEmail(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  return {
    local: trimmed.slice(0, at),
    domain: trimmed.slice(at + 1).toLowerCase(),
  };
}

/**
 * Optimal string alignment distance (Levenshtein plus adjacent transposition).
 * Transposition counts as one edit because swapped letters — "gmial"/"gmail" —
 * are the single most common way people misspell a domain.
 */
function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () =>
    new Array<number>(bl + 1).fill(0),
  );
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[al][bl];
}

/**
 * Offer a corrected address when the domain looks like a typo of a popular one,
 * else null. Returns the whole address (local part preserved) so it can be
 * shown as "Did you mean jane@gmail.com?".
 */
export function suggestEmailCorrection(email: string): string | null {
  const parts = splitEmail(email);
  if (!parts) return null;
  const { local, domain } = parts;

  // Already a domain we know — nothing to fix.
  if (COMMON_DOMAINS.includes(domain)) return null;

  // Explicit, high-confidence misspelling.
  const known = KNOWN_DOMAIN_TYPOS[domain];
  if (known) return `${local}@${known}`;

  // Otherwise the nearest common domain, but only within a single edit so we
  // don't "correct" a legitimate address that merely resembles a big provider.
  let best: string | null = null;
  let bestDist = Infinity;
  for (const cand of COMMON_DOMAINS) {
    const dist = editDistance(domain, cand);
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best && bestDist === 1 ? `${local}@${best}` : null;
}

export interface EmailShapeResult {
  /** False when we're confident enough to reject at the form. */
  ok: boolean;
  /** A corrected address to offer the user, when we have one. */
  suggestion?: string;
}

/**
 * The pure half of the signup check: reject a malformed address or a
 * high-confidence domain typo, and attach a suggested fix when possible.
 * A well-formed address at an unknown domain passes here and is left for the
 * DNS check in email-domain.ts.
 */
export function checkEmailShape(email: string): EmailShapeResult {
  const suggestion = suggestEmailCorrection(email) ?? undefined;

  if (!isValidEmailFormat(email)) return { ok: false, suggestion };

  const parts = splitEmail(email);
  if (parts && KNOWN_DOMAIN_TYPOS[parts.domain]) {
    return { ok: false, suggestion };
  }
  return { ok: true, suggestion };
}
