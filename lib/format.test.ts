import { describe, it, expect } from "vitest";
import {
  sizedImage,
  formatFollowers,
  formatEngagement,
  creatorAvatar,
  cleanHandle,
  instagramUrl,
  tiktokUrl,
} from "./format";

const STORAGE =
  "https://abc.supabase.co/storage/v1/object/public/avatars/user-1/photo.jpg";

describe("sizedImage", () => {
  // This is the regression test for the bug that reached production on
  // 2026-07-14: without resize=contain, Supabase honours the width but keeps
  // the ORIGINAL height, so a tall portrait comes back as a 720x5712 sliver and
  // the card's object-cover crops it into a wild zoom. Every creator photo on
  // the site was wrong. If this assertion ever fails, that bug is back.
  it("always asks Supabase to preserve the aspect ratio", () => {
    expect(sizedImage(STORAGE, 360)).toContain("resize=contain");
  });

  it("points at the render endpoint, not the raw object", () => {
    const url = sizedImage(STORAGE, 360)!;
    expect(url).toContain("/storage/v1/render/image/public/");
    expect(url).not.toContain("/storage/v1/object/public/");
  });

  it("requests 2x the slot width, for retina screens", () => {
    expect(sizedImage(STORAGE, 360)).toContain("width=720");
    expect(sizedImage(STORAGE, 44)).toContain("width=88");
  });

  it("leaves non-Supabase images alone (Instagram/TikTok avatars)", () => {
    const ig = "https://scontent.cdninstagram.com/v/t51/avatar.jpg";
    expect(sizedImage(ig, 360)).toBe(ig);
  });

  it("handles a missing image", () => {
    expect(sizedImage(null, 360)).toBeNull();
    expect(sizedImage(undefined, 360)).toBeNull();
    expect(sizedImage("", 360)).toBeNull();
  });

  it("does not double up a query string", () => {
    const url = sizedImage(`${STORAGE}?stale=1`, 360)!;
    expect(url.match(/\?/g)).toHaveLength(1);
    expect(url).not.toContain("stale=1");
  });
});

describe("formatFollowers", () => {
  it("abbreviates the way a human would", () => {
    expect(formatFollowers(999)).toBe("999");
    expect(formatFollowers(1_240)).toBe("1.2k");
    expect(formatFollowers(31_500)).toBe("31.5k");
    expect(formatFollowers(3_400_000)).toBe("3.4M");
  });

  it("drops a pointless trailing .0", () => {
    expect(formatFollowers(2_000)).toBe("2k");
    expect(formatFollowers(5_000_000)).toBe("5M");
  });

  it("has nothing to show for a missing count", () => {
    expect(formatFollowers(null)).toBeNull();
    expect(formatFollowers(undefined)).toBeNull();
  });
});

describe("formatEngagement", () => {
  it("shows one decimal place", () => {
    expect(formatEngagement(3.324)).toBe("3.3%");
  });

  // A zero or negative rate means "we never worked it out", not "0% engagement".
  // Showing 0.0% on a card would libel the creator.
  it("hides a missing or nonsense rate rather than printing 0.0%", () => {
    expect(formatEngagement(null)).toBeNull();
    expect(formatEngagement(0)).toBeNull();
    expect(formatEngagement(-1)).toBeNull();
    expect(formatEngagement(NaN)).toBeNull();
  });

  it("caps at 100% so a bad import can't print 4000%", () => {
    expect(formatEngagement(4000)).toBe("100.0%");
  });
});

describe("creatorAvatar", () => {
  // An uploaded photo is the creator's deliberate choice; the imported social
  // avatars are only ever a fallback and must never override it.
  it("prefers the uploaded photo over imported ones", () => {
    expect(
      creatorAvatar({
        profile_image: "uploaded.jpg",
        instagram_avatar: "ig.jpg",
        tiktok_avatar: "tt.jpg",
      }),
    ).toBe("uploaded.jpg");
  });

  it("falls back to Instagram, then TikTok, then nothing", () => {
    expect(
      creatorAvatar({ profile_image: null, instagram_avatar: "ig.jpg", tiktok_avatar: "tt.jpg" }),
    ).toBe("ig.jpg");
    expect(
      creatorAvatar({ profile_image: null, instagram_avatar: null, tiktok_avatar: "tt.jpg" }),
    ).toBe("tt.jpg");
    expect(
      creatorAvatar({ profile_image: null, instagram_avatar: null, tiktok_avatar: null }),
    ).toBeNull();
  });
});

describe("handles and profile links", () => {
  it("strips the @ people habitually type", () => {
    expect(cleanHandle("@zac")).toBe("zac");
    expect(cleanHandle("  @@zac ")).toBe("zac");
  });

  it("builds profile URLs", () => {
    expect(instagramUrl("@zac")).toBe("https://instagram.com/zac");
    expect(tiktokUrl("@zac")).toBe("https://tiktok.com/@zac");
  });

  it("passes through a handle that's already a full URL", () => {
    const url = "https://instagram.com/zac";
    expect(instagramUrl(url)).toBe(url);
  });
});
