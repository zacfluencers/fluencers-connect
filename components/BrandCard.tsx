import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MessageBrandButton } from "@/components/MessageBrandButton";
import { gbp } from "@/lib/format";
import type { BrandProfile } from "@/lib/types";

export function BrandCard({
  brand,
  canMessage,
}: {
  brand: BrandProfile;
  canMessage: boolean;
}) {
  const budget =
    brand.budget_min != null && brand.budget_max != null
      ? `${gbp.format(brand.budget_min)}–${gbp.format(brand.budget_max)}`
      : brand.budget_max != null
        ? `up to ${gbp.format(brand.budget_max)}`
        : brand.budget_min != null
          ? `from ${gbp.format(brand.budget_min)}`
          : null;

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-base font-semibold text-white">
            {brand.company_name.charAt(0).toUpperCase()}
          </span>
          <h3 className="text-h3 font-semibold text-[var(--foreground)]">
            {brand.company_name}
          </h3>
        </div>
        <Badge tone="info">Looking for creators</Badge>
      </div>

      {brand.about && (
        <p className="mt-4 line-clamp-3 text-sm text-[var(--muted)]">
          {brand.about}
        </p>
      )}

      {budget && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Budget <span className="font-semibold text-[var(--foreground)]">{budget}</span> / job
        </p>
      )}

      {canMessage && (
        <div className="mt-5">
          <MessageBrandButton brandId={brand.user_id} />
        </div>
      )}
    </Card>
  );
}
