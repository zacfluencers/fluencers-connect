import { describe, it, expect } from "vitest";
import {
  profileStrength,
  rotationKey,
  rotationDay,
  rankCreators,
} from "./creator-ranking";

const creator = (
  user_id: string,
  extra: Partial<{
    niche: string | null;
    bio: string | null;
    engagement_rate: number | null;
  }> = {},
) => ({
  user_id,
  niche: extra.niche ?? "Lifestyle",
  bio: extra.bio ?? null,
  engagement_rate: extra.engagement_rate ?? null,
});

const DAY = "2026-07-22";

describe("profileStrength", () => {
  it("weights portfolio video highest - it's the only thing a brand can judge the work by", () => {
    expect(profileStrength(creator("a"), true)).toBe(2);
    expect(profileStrength(creator("a", { engagement_rate: 5 }), false)).toBe(1);
  });

  it("wants a real bio, not a placeholder", () => {
    expect(profileStrength(creator("a", { bio: "Hi" }), false)).toBe(0);
    expect(
      profileStrength(
        creator("a", { bio: "Fitness creator making gym content in Leeds." }),
        false,
      ),
    ).toBe(1);
  });

  it("adds up", () => {
    const full = creator("a", {
      bio: "Fitness creator making gym content in Leeds.",
      engagement_rate: 4.2,
    });
    expect(profileStrength(full, true)).toBe(4);
  });

  // Photo, rates and follower counts are required by the profile form, so
  // every creator has them and scoring them would separate nobody.
  it("scores a bare-but-valid profile at zero", () => {
    expect(profileStrength(creator("a"), false)).toBe(0);
  });
});

describe("rotationKey", () => {
  it("is stable within a day, so the page doesn't reshuffle under a brand", () => {
    expect(rotationKey("abc", DAY)).toBe(rotationKey("abc", DAY));
  });

  it("changes between days, so nobody is permanently top", () => {
    expect(rotationKey("abc", DAY)).not.toBe(rotationKey("abc", "2026-07-23"));
  });

  it("separates different creators on the same day", () => {
    expect(rotationKey("abc", DAY)).not.toBe(rotationKey("abd", DAY));
  });

  it("stamps the day in UTC", () => {
    expect(rotationDay(new Date("2026-07-22T23:30:00Z"))).toBe("2026-07-22");
  });
});

describe("rankCreators", () => {
  const strong = creator("strong", {
    bio: "Fitness creator making gym content in Leeds.",
    engagement_rate: 4,
  });
  const thin = creator("thin");

  it("puts better-presented profiles first", () => {
    const ranked = rankCreators([thin, strong], {
      portfolioIds: new Set(["strong"]),
      day: DAY,
    });
    expect(ranked.map((c) => c.user_id)).toEqual(["strong", "thin"]);
  });

  // The whole point of the daily shuffle: strength is a 0-4 score across a
  // large roster, so ties are the common case. Without rotation the same
  // faces would lead the page forever - the alphabet problem again.
  it("reshuffles equally-strong creators between days", () => {
    const tied = ["a", "b", "c", "d", "e", "f"].map((id) => creator(id));
    const monday = rankCreators(tied, { day: "2026-07-20" }).map(
      (c) => c.user_id,
    );
    const tuesday = rankCreators(tied, { day: "2026-07-21" }).map(
      (c) => c.user_id,
    );
    expect(monday).not.toEqual(tuesday);
    expect([...monday].sort()).toEqual([...tuesday].sort());
  });

  it("gives the same order twice on the same day", () => {
    const tied = ["a", "b", "c", "d"].map((id) => creator(id));
    expect(rankCreators(tied, { day: DAY })).toEqual(
      rankCreators(tied, { day: DAY }),
    );
  });

  // Specialists outrank people who merely listed the niche as a secondary.
  // This is what makes unlimited secondary niches safe: breadth buys
  // visibility, never rank.
  it("puts main-niche matches above secondary-only matches when filtering", () => {
    const specialist = creator("specialist", { niche: "Beauty & Skincare" });
    const dabbler = creator("dabbler", { niche: "Lifestyle" });
    const ranked = rankCreators([dabbler, specialist], {
      niches: ["Beauty & Skincare"],
      day: DAY,
    });
    expect(ranked[0].user_id).toBe("specialist");
  });

  // Niche focus must beat strength, or a thin specialist would be pushed
  // below a polished creator who only dabbles in what the brand asked for.
  it("ranks niche match above profile strength", () => {
    const thinSpecialist = creator("thin-specialist", {
      niche: "Beauty & Skincare",
    });
    const strongDabbler = creator("strong-dabbler", {
      niche: "Lifestyle",
      bio: "Lifestyle creator with a long and complete biography here.",
      engagement_rate: 6,
    });
    const ranked = rankCreators([strongDabbler, thinSpecialist], {
      niches: ["Beauty & Skincare"],
      portfolioIds: new Set(["strong-dabbler"]),
      day: DAY,
    });
    expect(ranked[0].user_id).toBe("thin-specialist");
  });

  it("ignores a filter value that isn't a real niche", () => {
    const ranked = rankCreators([thin, strong], {
      niches: ["Not A Niche"],
      portfolioIds: new Set(["strong"]),
      day: DAY,
    });
    expect(ranked[0].user_id).toBe("strong");
  });

  it("does not mutate the caller's array", () => {
    const input = [thin, strong];
    rankCreators(input, { portfolioIds: new Set(["strong"]), day: DAY });
    expect(input[0].user_id).toBe("thin");
  });

  it("handles an empty directory", () => {
    expect(rankCreators([], { day: DAY })).toEqual([]);
  });
});
