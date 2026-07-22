import { describe, it, expect } from "vitest";
import { canonicalRedirect } from "./canonical-host";

const SITE = "https://connect.fluencersgroup.com";
const GENERATED = "fluencers-connect.vercel.app";

const call = (over: Partial<Parameters<typeof canonicalRedirect>[0]> = {}) =>
  canonicalRedirect({
    requestUrl: `https://${GENERATED}/dashboard/creator`,
    host: GENERATED,
    siteUrl: SITE,
    vercelEnv: "production",
    ...over,
  });

describe("canonicalRedirect", () => {
  it("sends the generated vercel.app host to the real domain", () => {
    expect(call()).toBe("https://connect.fluencersgroup.com/dashboard/creator");
  });

  // An email link points somewhere specific. Dropping the path would land the
  // creator on the home page having lost whatever they clicked.
  it("keeps the path and query", () => {
    expect(
      call({
        requestUrl: `https://${GENERATED}/auth/callback?code=abc123&next=%2Fdashboard`,
      }),
    ).toBe(
      "https://connect.fluencersgroup.com/auth/callback?code=abc123&next=%2Fdashboard",
    );
  });

  it("leaves the canonical host alone", () => {
    expect(
      call({
        host: "connect.fluencersgroup.com",
        requestUrl: `${SITE}/dashboard/creator`,
      }),
    ).toBeNull();
  });

  it("ignores case when comparing hosts", () => {
    expect(call({ host: "Connect.FluencersGroup.com" })).toBeNull();
  });

  // The one that matters most. Preview deployments are SERVED on generated
  // *.vercel.app hostnames - redirecting there would bounce every preview to
  // production and destroy the only place changes get reviewed.
  it("never touches preview deployments", () => {
    expect(call({ vercelEnv: "preview" })).toBeNull();
  });

  it("never touches local development", () => {
    expect(call({ vercelEnv: undefined })).toBeNull();
    expect(
      call({
        vercelEnv: "development",
        host: "localhost:3000",
        requestUrl: "http://localhost:3000/",
      }),
    ).toBeNull();
  });

  // Failing open is the safer default: serving the page on an odd hostname is
  // recoverable, redirecting every visitor to an invalid URL is not.
  it("does nothing when the site URL is missing or malformed", () => {
    expect(call({ siteUrl: undefined })).toBeNull();
    expect(call({ siteUrl: "" })).toBeNull();
    expect(call({ siteUrl: "not-a-url" })).toBeNull();
  });

  it("does nothing without a host header", () => {
    expect(call({ host: null })).toBeNull();
  });
});
