import { describe, it, expect } from "vitest";
import { sanitiseSecondaryNiches, NICHES } from "./niches";

describe("sanitiseSecondaryNiches", () => {
  it("keeps valid picks in the order chosen", () => {
    expect(sanitiseSecondaryNiches(["Beauty & Skincare", "Travel"], "Fitness & Gym")).toEqual([
      "Beauty & Skincare",
      "Travel",
    ]);
  });

  // The primary niche is what shows on the card. Letting it through as a
  // secondary too would double-count the creator and make the "+N more" count
  // claim breadth they don't have.
  it("drops the primary niche if it is also ticked", () => {
    expect(sanitiseSecondaryNiches(["Beauty & Skincare", "Travel"], "Beauty & Skincare")).toEqual([
      "Travel",
    ]);
  });

  it("de-duplicates", () => {
    expect(
      sanitiseSecondaryNiches(["Travel", "Travel", "Beauty & Skincare"], "Lifestyle"),
    ).toEqual(["Travel", "Beauty & Skincare"]);
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
