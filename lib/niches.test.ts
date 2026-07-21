import { describe, it, expect } from "vitest";
import { sanitiseSecondaryNiches, MAX_SECONDARY_NICHES } from "./niches";

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

  it("enforces the cap", () => {
    const many = [
      "Skincare",
      "Travel",
      "Gaming",
      "Automotive",
      "Sustainability",
      "Comedy & Entertainment",
      "Art & Design",
    ];
    const result = sanitiseSecondaryNiches(many, "Lifestyle");
    expect(result).toHaveLength(MAX_SECONDARY_NICHES);
    expect(result).toEqual(many.slice(0, MAX_SECONDARY_NICHES));
  });

  it("handles an empty submission", () => {
    expect(sanitiseSecondaryNiches([], "Lifestyle")).toEqual([]);
  });
});
