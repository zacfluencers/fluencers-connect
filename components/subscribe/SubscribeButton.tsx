"use client";

import { Button } from "@/components/ui/Button";
import { useSubscribe } from "./SubscribeModalProvider";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

/**
 * A button that opens the shared subscribe popup. `reason` becomes the popup's
 * subheading, so the prompt matches what the brand was trying to do (e.g.
 * "Subscribe to message creators"). Looks identical to a normal Button.
 */
export function SubscribeButton({
  reason,
  children = "Subscribe",
  variant = "primary",
  size = "sm",
  className = "",
}: {
  reason?: string;
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { open } = useSubscribe();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => open(reason)}
    >
      {children}
    </Button>
  );
}
