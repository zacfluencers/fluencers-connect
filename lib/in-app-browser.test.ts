import { describe, it, expect } from "vitest";
import { detectInAppBrowser } from "./in-app-browser";

// Real user-agent strings. The negative cases matter as much as the positive
// ones: wrongly telling somebody in normal Safari to "open in your browser"
// is worse than saying nothing, because there is no button for them to press.
const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113 (iPhone14,3; iOS 17_0; en_US)";
const TIKTOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_2022803040 JsSdk/1.0 NetType/WIFI BytedanceWebview/d8a21c6";
const FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/399.0.0.29.115;FBBV/12345]";

describe("detectInAppBrowser", () => {
  it("spots the apps we actually invite creators through", () => {
    expect(detectInAppBrowser(INSTAGRAM)).toBe("Instagram");
    expect(detectInAppBrowser(TIKTOK)).toBe("TikTok");
    expect(detectInAppBrowser(FACEBOOK)).toBe("Facebook");
  });

  // A false positive here shows an unescapable "escape this browser" banner to
  // someone already in a real browser.
  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(IOS_SAFARI)).toBeNull();
    expect(detectInAppBrowser(ANDROID_CHROME)).toBeNull();
    expect(detectInAppBrowser(MAC_SAFARI)).toBeNull();
  });

  it("copes with a missing user agent", () => {
    expect(detectInAppBrowser("")).toBeNull();
  });
});
