"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

/**
 * Invisible bot check on our auth forms (Cloudflare Turnstile).
 *
 * Why it exists: through Aug 2026 we got a daily drip of automated junk
 * signups. This is the durable fix - our login system (Supabase) verifies the
 * token behind the scenes, so a bot is turned away even if it skips the website
 * form and hits the sign-up endpoint directly. Enable it under
 * Supabase → Authentication → Bot and Abuse Protection.
 *
 * The public "site key" is safe to ship in the browser (that's how Turnstile
 * works); the matching SECRET key lives only in the Supabase dashboard.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAEbdGNqH05JZI_kI";

export type CaptchaHandle = {
  /** Wipe the used token and ask for a fresh one (tokens are single-use). */
  reset: () => void;
};

/**
 * Drops a hidden `captchaToken` field into the surrounding form and keeps it
 * filled with a fresh token. `action` labels which form this guards.
 *
 * Fails open on purpose: if the widget can't load (network, blocked, an
 * un-listed domain) we still let the form submit rather than trap a real user.
 * Supabase only rejects a missing token once CAPTCHA is switched on there.
 */
export function Captcha({
  action,
  onReadyChange,
  ref,
}: {
  action: string;
  /** Called with true once a token is available (or the check is unavailable). */
  onReadyChange?: (ready: boolean) => void;
  ref?: Ref<CaptchaHandle>;
}) {
  const [token, setToken] = useState("");
  const widget = useRef<TurnstileInstance | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      setToken("");
      onReadyChange?.(false);
      widget.current?.reset();
    },
  }));

  return (
    <div>
      <input type="hidden" name="captchaToken" value={token} readOnly />
      <Turnstile
        ref={widget}
        siteKey={TURNSTILE_SITE_KEY}
        options={{ action, size: "flexible", appearance: "interaction-only" }}
        onSuccess={(t) => {
          setToken(t);
          onReadyChange?.(true);
        }}
        onExpire={() => {
          setToken("");
          onReadyChange?.(false);
          widget.current?.reset();
        }}
        onError={() => {
          // Don't strand a real person if Cloudflare is unreachable.
          setToken("");
          onReadyChange?.(true);
        }}
      />
    </div>
  );
}
