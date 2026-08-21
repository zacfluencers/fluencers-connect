import { describe, it, expect } from "vitest";
import {
  isCarrierGateway,
  looksLikeGmailDotScatter,
  checkSignupAbuse,
} from "./signup-abuse";

describe("isCarrierGateway", () => {
  it("blocks phone text-message gateways", () => {
    expect(isCarrierGateway("2318812474@vtext.com")).toBe(true);
    expect(isCarrierGateway("555@tmomail.net")).toBe(true);
    expect(isCarrierGateway("bob@TXT.ATT.NET")).toBe(true); // case-insensitive
  });

  it("leaves real inboxes alone", () => {
    expect(isCarrierGateway("jane@gmail.com")).toBe(false);
    expect(isCarrierGateway("hello@theformula.shop")).toBe(false);
  });
});

describe("looksLikeGmailDotScatter", () => {
  it("catches the real bot signups we saw", () => {
    // Actual junk addresses removed on 21 Aug 2026.
    expect(looksLikeGmailDotScatter("ja.ip.a.l.s.ing.h10.2.3@gmail.com")).toBe(true);
    expect(looksLikeGmailDotScatter("m.a.p7.875.7@gmail.com")).toBe(true);
    expect(looksLikeGmailDotScatter("law.r.en.c.e.tho.f.ma.nn@gmail.com")).toBe(true);
    expect(looksLikeGmailDotScatter("k.o.d.o.mu.qit9.7.9@gmail.com")).toBe(true);
    expect(looksLikeGmailDotScatter("l.uke.ad.am.b.aker1@gmail.com")).toBe(true); // 5 dots
    expect(looksLikeGmailDotScatter("cs.w.hi.ti.n.gjr@gmail.com")).toBe(true); // 5 dots
  });

  it("does not flag ordinary Gmail addresses", () => {
    expect(looksLikeGmailDotScatter("jane@gmail.com")).toBe(false);
    expect(looksLikeGmailDotScatter("jane.doe@gmail.com")).toBe(false);
    expect(looksLikeGmailDotScatter("jane.marie.doe@gmail.com")).toBe(false); // first.middle.last
    expect(looksLikeGmailDotScatter("jane.doe+promo@gmail.com")).toBe(false); // +tag ignored
    expect(looksLikeGmailDotScatter("j.smith@gmail.com")).toBe(false);
  });

  it("only judges Gmail, where dots collapse to one inbox", () => {
    // Same shape on another provider is left for other checks - dots matter there.
    expect(looksLikeGmailDotScatter("a.b.c.d.e@outlook.com")).toBe(false);
  });
});

describe("checkSignupAbuse", () => {
  it("blocks the bot fingerprints with a friendly reason", () => {
    expect(checkSignupAbuse("2318812474@vtext.com").ok).toBe(false);
    expect(checkSignupAbuse("m.a.p7.875.7@gmail.com").ok).toBe(false);
  });

  it("lets genuine signups through", () => {
    expect(checkSignupAbuse("jane.doe@gmail.com")).toEqual({ ok: true });
    expect(checkSignupAbuse("rebecca@hotmail.co.uk")).toEqual({ ok: true });
  });
});
