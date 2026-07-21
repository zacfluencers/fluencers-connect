import { describe, it, expect } from "vitest";
import { sanitiseSecondaryNiches, rankByNicheFocus, NICHES } from "./niches";

describe("sanitiseSecondaryNiches", () => {
  it("keeps valid picks in the order chosen", () => {
    expect(sanitiseSecondaryNiches(["Skincare", "Travel"], "Fitness & Gym")).toEqual([
      "Skincare",
      "Travel",
    ]);
  });

  // The primary niche is what shows on the card. Letting it through as a
  // secondary too would double-count the creator and make the "+N more" count
  // claim breadth they don't have.
  it("drops the primary niche if it is also ticked", () => {
    expect(sanitiseSecondaryNiches(["Skincare", "Travel"], "Skincare")).toEqual([
      "Travel",
    ]);
  });

  it("de-duplicates", () => {
    expect(
      sanitiseSecondaryNiches(["Travel", "Travel", "Skincare"], "Lifestyle"),
    ).toEqual(["Travel", "Skincare"]);
  });

  // These values are interpolated into the marketplace's PostgREST filter
  // string, so anything not on our fixed list must never survive this. A
  // crafted profile save is the only way user text could reach that query.
  it("rejects anything not on the canonical list", () => {
    expect(
      sanitiseSecondaryNiches(
        ['Travel"),secondary_niches.ov.{"x', "Not A Niche", ""],
        "Lifestyle",
      ),
    ).toEqual([]);
  });

  it("trims whitespace before matching", () => {
    expect(sanitiseSecondaryNiches(["  Travel  "], "Lifestyle")).toEqual([
      "Travel",
    ]);
  });

  // Creators told us a cap of 5 felt limiting. It's safe to remove because
  // rankByNicheFocus() now stops breadth buying rank - see below.
  it("does not cap how many a creator may claim", () => {
    const every = NICHES.filter((n) => n !== "Lifestyle");
    expect(sanitiseSecondaryNiches([...every], "Lifestyle")).toEqual(every);
  });

  it("handles an empty submission", () => {
    expect(sanitiseSecondaryNiches([], "Lifestyle")).toEqual([]);
  });
});

describe("rankByNicheFocus", () => {
  const priya = { niche: "Skincare", secondary_niches: [] };
  const karlie = { niche: "Lifestyle", secondary_niches: ["Skincare"] };
  const tom = { niche: "Gaming", secondary_niches: ["Skincare", "Travel"] };

  // The whole reason unlimited secondary niches are safe: a creator who tags
  // everything appears in every search but never above someone it's actually
  // the main focus for, so there's no gain in spamming the list.
  it("puts main-niche matches above secondary-only matches", () => {
    expect(
      rankByNicheFocus([karlie, tom, priya], ["Skincare"]).map((c) => c.niche),
    ).toEqual(["Skincare", "Lifestyle", "Gaming"]);
  });

  it("keeps the existing order within each group", () => {
    const a = { niche: "Skincare", secondary_niches: [] };
    const b = { niche: "Skincare", secondary_niches: [] };
    const ranked = rankByNicheFocus([a, b, karlie], ["Skincare"]);
    expect(ranked[0]).toBe(a);
    expect(ranked[1]).toBe(b);
  });

  it("leaves the list untouched when no niche filter is applied", () => {
    const input = [karlie, tom, priya];
    expect(rankByNicheFocus(input, [])).toEqual(input);
  });

  it("handles a creator with no niche set", () => {
    const nameless = { niche: null, secondary_niches: null };
    expect(
      rankByNicheFocus([nameless, priya], ["Skincare"]).map((c) => c.niche),
    ).toEqual(["Skincare", null]);
  });
});
