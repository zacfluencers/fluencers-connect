import "server-only";
import { resolveMx } from "node:dns/promises";

/**
 * Does the domain part of an address actually run a mail service? — SERVER ONLY.
 *
 * A live DNS lookup, so it can't be pure (that's why it isn't in
 * email-validation.ts). Deliberately lenient: a DNS hiccup, a timeout, or a
 * domain that receives mail without MX records must NEVER block a real signup.
 * We report a hard failure only when the domain plainly does not exist
 * (NXDOMAIN) — which is exactly the "megan@gmail.con" class of typo.
 */

const TIMEOUT_MS = 2500;

export async function checkEmailDomain(
  email: string,
): Promise<"ok" | "no-domain"> {
  const at = email.lastIndexOf("@");
  if (at < 0) return "ok"; // the format check already caught this
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain) return "ok";

  try {
    // Whichever settles first: the lookup, or a timeout that fails open.
    await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("dns-timeout")), TIMEOUT_MS),
      ),
    ]);
    // Resolved (with or without records) — treat as deliverable.
    return "ok";
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    // NXDOMAIN means the domain genuinely doesn't exist: a safe-to-block typo.
    // Anything else (no MX but a real domain, a timeout, a transient blip)
    // fails open so we never turn away a good signup over a DNS wobble.
    return code === "ENOTFOUND" ? "no-domain" : "ok";
  }
}
