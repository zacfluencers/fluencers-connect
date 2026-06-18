"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBrandFavorite } from "@/app/actions/favorites";

/** Save/unsave a brand — creator-only. Optimistic UI. */
export function BrandFavoriteButton({
  brandId,
  initialFavorited,
  variant = "icon",
}: {
  brandId: string;
  initialFavorited: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorited;
    setFavorited(next); // optimistic
    startTransition(async () => {
      const result = await toggleBrandFavorite(brandId);
      if ("error" in result) {
        setFavorited(!next); // revert
        router.refresh();
      } else {
        setFavorited(result.favorited);
      }
    });
  }

  const icon = (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={favorited ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={favorited}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          favorited
            ? "border-[var(--accent-2)] bg-[var(--accent-2)]/12 text-[var(--accent-2)]"
            : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--accent-2)]/50"
        }`}
      >
        {icon}
        {favorited ? "Saved" : "Save brand"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={favorited ? "Remove from favourites" : "Save brand"}
      aria-pressed={favorited}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-90 ${
        favorited
          ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-white"
          : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {icon}
    </button>
  );
}
