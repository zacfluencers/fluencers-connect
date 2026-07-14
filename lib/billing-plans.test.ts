import { describe, it, expect } from "vitest";
import { isSubscribed } from "./billing-plans";

/**
 * This one function decides whether a brand can book, message and favourite —
 * i.e. whether they get the thing they pay for. Getting it wrong in either
 * direction is expensive: too strict and paying customers are locked out, too
 * loose and the product is free.
 */
describe("isSubscribed", () => {
  it("lets an active subscriber in", () => {
    expect(isSubscribed("active")).toBe(true);
    expect(isSubscribed("trialing")).toBe(true);
  });

  // Deliberate: a failed card shouldn't slam the door on a paying customer
  // mid-campaign. Stripe retries for days, and they keep access while it does.
  it("keeps a past_due subscriber in while Stripe retries their card", () => {
    expect(isSubscribed("past_due")).toBe(true);
  });

  it("locks out everyone else", () => {
    expect(isSubscribed("canceled")).toBe(false);
    expect(isSubscribed("incomplete")).toBe(false);
    expect(isSubscribed("incomplete_expired")).toBe(false);
    expect(isSubscribed("unpaid")).toBe(false);
    expect(isSubscribed("paused")).toBe(false);
  });

  it("locks out a brand who never subscribed", () => {
    expect(isSubscribed(null)).toBe(false);
    expect(isSubscribed(undefined)).toBe(false);
    expect(isSubscribed("")).toBe(false);
  });

  it("doesn't fall for a lookalike status", () => {
    expect(isSubscribed("inactive")).toBe(false);
    expect(isSubscribed("ACTIVE")).toBe(false);
  });
});
