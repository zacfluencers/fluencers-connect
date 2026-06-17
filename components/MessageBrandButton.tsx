"use client";

import { useState, useTransition } from "react";
import { startDirectConversation } from "@/app/actions/messages";
import { Button } from "@/components/ui/Button";

/** Creator-only: open (or resume) a direct conversation with a brand. */
export function MessageBrandButton({
  brandId,
  size = "sm",
}: {
  brandId: string;
  size?: "sm" | "md" | "lg";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size={size}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startDirectConversation(brandId);
            if (result && "error" in result) setError(result.error);
          });
        }}
      >
        {pending ? "Opening…" : "Message brand"}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
