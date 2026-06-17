"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/actions/favorites";

/** Heart toggle. Signed-out users are sent to login. Optimistic UI. */
export function FavoriteButton({
  creatorId,
  initialFavorited,
  canFavorite,
  variant = "icon",
}: {
  creatorId: string;
  initialFavorited: boolean;
  canFavorite: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    // Stop the card's link from navigating when the heart is inside one.
    e.preventDefault();
    e.stopPropagation();

    if (!canFavorite) {
      router.push("/login");
      return;
    }

    const next = !favorited;
    setFavorited(next); // optimistic
    startTransition(async () => {
      const result = await toggleFavorite(creatorId);
      if ("error" in result) setFavorited(!next); // revert
      else setFavorited(result.favorited);
    });
  }

  // Bookmark reads cleanly as "save to come back to" and renders crisply.
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
        {favorited ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={favorited ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={favorited}
      className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-all active:scale-90 ${
        favorited
          ? "bg-[var(--accent-2)] text-white shadow-[0_0_18px_-4px_rgba(132,105,237,0.9)]"
          : "bg-black/35 text-white hover:bg-black/55"
      }`}
    >
      {icon}
    </button>
  );
}
