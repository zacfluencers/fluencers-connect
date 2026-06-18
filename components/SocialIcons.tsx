/** Brand glyphs for social platforms. Inherit colour via currentColor. */

export function InstagramIcon({ className }: { className?: string }) {
  // Clean line-style glyph: rounded square + lens + flash dot. Stroked so the
  // edges stay crisp and nothing clips at small sizes.
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  // Line-style music-note glyph, matching the Instagram outline weight.
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="16" r="4" />
      <path d="M13 16V5c.8 2.7 2.8 4.2 5 4.4" />
    </svg>
  );
}
