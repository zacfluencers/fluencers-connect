import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for email links (password reset, and any future magic links).
 * Supabase sends the user here with a one-time `code`; we exchange it for a
 * session (sets the auth cookies) and forward them to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No/invalid code — send them back to sign in with a gentle note.
  return NextResponse.redirect(`${origin}/login?reset_error=1`);
}
