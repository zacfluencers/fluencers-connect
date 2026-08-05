import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Token-hash auth callback (used when the email template sends a `token_hash`
 * link). Unlike the `code`/PKCE flow in /auth/callback, `verifyOtp` needs no
 * verifier cookie, so it works even when the email is opened on another device.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const explicitNext = searchParams.get("next");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // A password-recovery link must land on the reset form; honour the
      // template's `next` (defaults to the reset page if it's missing).
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}${explicitNext ?? "/reset-password"}`);
      }
      // Signup confirmation: if the link named a destination, use it; otherwise
      // send them to the right first-run screen for their role, exactly like a
      // normal sign-in does.
      if (explicitNext) {
        return NextResponse.redirect(`${origin}${explicitNext}`);
      }
      let role: string | null = null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      }
      const dest = role === "creator" ? "/dashboard/creator" : "/welcome";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?link_error=1`);
}
