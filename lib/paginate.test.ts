import { describe, it, expect } from "vitest";
import { paginate } from "./paginate";

const list = Array.from({ length: 50 }, (_, i) => i);

describe("paginate", () => {
  it("returns the first page when no param is given", () => {
    const { visible, page, pageCount, start } = paginate(list, undefined, 24);
    expect(page).toBe(1);
    expect(start).toBe(0);
    expect(pageCount).toBe(3);
    expect(visible).toEqual(list.slice(0, 24));
  });

  it("slices the requested page", () => {
    const { visible, start } = paginate(list, "2", 24);
    expect(start).toBe(24);
    expect(visible).toEqual(list.slice(24, 48));
  });

  it("clamps a too-high page to the last real page", () => {
    const { page, visible } = paginate(list, "99", 24);
    expect(page).toBe(3);
    expect(visible).toEqual(list.slice(48, 50));
  });

  it("clamps zero and negative pages up to the first page", () => {
    expect(paginate(list, "0", 24).page).toBe(1);
    expect(paginate(list, "-5", 24).page).toBe(1);
  });

  it("falls back to page 1 for a non-numeric param", () => {
    expect(paginate(list, "abc", 24).page).toBe(1);
  });

  it("reports one page for an empty list rather than zero", () => {
    const { page, pageCount, visible } = paginate([], undefined, 24);
    expect(page).toBe(1);
    expect(pageCount).toBe(1);
    expect(visible).toEqual([]);
  });
});
