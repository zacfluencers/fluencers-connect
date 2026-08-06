import { describe, it, expect } from "vitest";
import {
  isValidEmailFormat,
  suggestEmailCorrection,
  checkEmailShape,
} from "./email-validation";

describe("isValidEmailFormat", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmailFormat("jane@gmail.com")).toBe(true);
    expect(isValidEmailFormat("jane.doe+promo@sub.example.co.uk")).toBe(true);
    expect(isValidEmailFormat("  jane@gmail.com  ")).toBe(true); // trimmed
  });

  it("rejects the obviously broken", () => {
    expect(isValidEmailFormat("janegmail.com")).toBe(false); // no @
    expect(isValidEmailFormat("jane@gmail")).toBe(false); // no TLD
    expect(isValidEmailFormat("jane@gmail.c")).toBe(false); // 1-char TLD
    expect(isValidEmailFormat("jane @gmail.com")).toBe(false); // space
    expect(isValidEmailFormat("jane@@gmail.com")).toBe(false); // double @
    expect(isValidEmailFormat("")).toBe(false);
  });
});

describe("suggestEmailCorrection", () => {
  it("fixes high-confidence domain typos and keeps the local part", () => {
    expect(suggestEmailCorrection("Jane.Doe@gmial.com")).toBe(
      "Jane.Doe@gmail.com",
    );
    expect(suggestEmailCorrection("bob@hotmial.com")).toBe("bob@hotmail.com");
    expect(suggestEmailCorrection("sam@gmail.con")).toBe("sam@gmail.com");
    expect(suggestEmailCorrection("sam@yahoo.con")).toBe("sam@yahoo.com");
  });

  it("catches a transposition within one edit", () => {
    // "gmai" is one deletion from "gmail"; still a near miss.
    expect(suggestEmailCorrection("jane@gmai.com")).toBe("jane@gmail.com");
  });

  it("leaves correct and unknown domains alone", () => {
    expect(suggestEmailCorrection("jane@gmail.com")).toBeNull();
    expect(suggestEmailCorrection("jane@icloud.com")).toBeNull();
    // A real, distinct business domain must not be "corrected".
    expect(suggestEmailCorrection("jane@theformula.shop")).toBeNull();
    expect(suggestEmailCorrection("jane@monzo.com")).toBeNull();
  });

  it("returns null for junk it can't parse", () => {
    expect(suggestEmailCorrection("not-an-email")).toBeNull();
    expect(suggestEmailCorrection("jane@")).toBeNull();
  });
});

describe("checkEmailShape", () => {
  it("passes a clean address with no suggestion", () => {
    expect(checkEmailShape("jane@gmail.com")).toEqual({ ok: true });
  });

  it("passes an unknown but well-formed domain (left for the DNS check)", () => {
    expect(checkEmailShape("jane@theformula.shop")).toEqual({ ok: true });
  });

  it("rejects a malformed address, offering a fix when it can find one", () => {
    expect(checkEmailShape("janegmail.com")).toEqual({ ok: false });
  });

  it("rejects a high-confidence domain typo with its correction", () => {
    expect(checkEmailShape("jane@gmial.com")).toEqual({
      ok: false,
      suggestion: "jane@gmail.com",
    });
  });
});
