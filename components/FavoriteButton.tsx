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

  const heart = (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={favorited ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 1.6 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.4 0 4.7 3.4 3 6.8C19.5 16.4 12 21 12 21z" />
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
        {heart}
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
      className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors ${
        favorited
          ? "bg-white/90 text-[var(--accent)]"
          : "bg-black/30 text-white hover:bg-black/50"
      }`}
    >
      {heart}
    </button>
  );
}
