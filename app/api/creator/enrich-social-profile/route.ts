import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { enrichCreatorSocial } from "@/lib/social/enrichment";
import { isScrapeCreatorsConfigured, type SocialPlatform } from "@/lib/social/scrapecreators";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok"];

/**
 * POST /api/creator/enrich-social-profile
 * Body: { creatorId, platform: "instagram" | "tiktok", handle }
 *
 * Fetches public profile data via ScrapeCreators (server-side; the API key
 * never reaches the browser), saves it, and returns the normalised profile.
 * A creator may only enrich their OWN profile.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: { creatorId?: string; platform?: string; handle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const creatorId = String(body.creatorId ?? "").trim();
  const platform = String(body.platform ?? "").trim() as SocialPlatform;
  const handle = String(body.handle ?? "").replace(/^@+/, "").trim();

  // A creator can only enrich their own profile.
  if (!creatorId || creatorId !== me.id || me.role !== "creator") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "Enter a handle first." }, { status: 400 });
  }
  if (!isScrapeCreatorsConfigured()) {
    return NextResponse.json(
      { error: "Social enrichment isn't set up yet." },
      { status: 503 },
    );
  }

  const result = await enrichCreatorSocial(creatorId, platform, handle);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ profile: result.profile });
}
