import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canonicalRedirect } from "@/lib/canonical-host";

// Next.js 16 "proxy" convention (formerly middleware). Keeps the Supabase
// auth session fresh on every request.
export default async function proxy(request: NextRequest) {
  // Before anything else: get everyone onto one hostname. Vercel also serves
  // production on a generated *.vercel.app address, where our cookies don't
  // exist - so a visitor there is silently signed out. Runs first because
  // refreshing a session on the wrong hostname is pointless work.
  //
  // Temporary (307) on purpose, not permanent: this follows an environment
  // variable that was itself wrong for 35 days, and a 308 would be cached in
  // people's browsers indefinitely if it were ever wrong again.
  const redirectTo = canonicalRedirect({
    requestUrl: request.url,
    host: request.headers.get("host"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelEnv: process.env.VERCEL_ENV,
  });
  if (redirectTo) return NextResponse.redirect(redirectTo, 307);

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets, images, and the Sentry tunnel.
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
