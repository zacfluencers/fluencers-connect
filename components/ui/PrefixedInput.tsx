"use client";

import { useState } from "react";

const WRAP =
  "flex w-full items-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] transition-colors focus-within:border-[var(--accent-2)]/70 focus-within:ring-2 focus-within:ring-[var(--accent-2)]/25";
const INNER =
  "min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-[var(--foreground)] placeholder:text-[var(--muted)]/60 outline-none";

function Labelled({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  if (!label) return <>{children}</>;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Social handle input with a fixed "@" prefix. The user types just the handle;
 * the value submitted with the form always includes the leading "@".
 */
export function HandleInput({
  name,
  defaultValue,
  placeholder = "yourhandle",
  label,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  label?: string;
}) {
  const [val, setVal] = useState((defaultValue ?? "").replace(/^@+/, ""));
  return (
    <Labelled label={label}>
      <div className={WRAP}>
        <span className="select-none pl-3.5 pr-1 text-[var(--muted)]">@</span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/^@+/, ""))}
          placeholder={placeholder}
          className={INNER}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <input type="hidden" name={name} value={val ? `@${val}` : ""} />
      </div>
    </Labelled>
  );
}

/**
 * URL input with a fixed "https://" prefix. The user types just the domain/path;
 * the submitted value always includes the scheme. Pasting a full URL (with
 * http:// or https://) strips the duplicate scheme automatically.
 */
export function UrlInput({
  name,
  defaultValue,
  placeholder = "yoursite.com",
  label,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  label?: string;
}) {
  const [val, setVal] = useState(
    (defaultValue ?? "").replace(/^https?:\/\//i, ""),
  );
  return (
    <Labelled label={label}>
      <div className={WRAP}>
        <span className="select-none pl-3.5 pr-0.5 text-sm text-[var(--muted)]">
          https://
        </span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/^https?:\/\//i, ""))}
          placeholder={placeholder}
          className={INNER}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <input type="hidden" name={name} value={val ? `https://${val}` : ""} />
      </div>
    </Labelled>
  );
}
