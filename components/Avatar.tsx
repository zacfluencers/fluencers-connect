import { sizedImage } from "@/lib/format";

/** Round avatar: profile image if present, else a gradient initial. */
export function Avatar({
  src,
  name,
  className = "h-10 w-10",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-sm font-semibold text-white ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sizedImage(src, 48) ?? src}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        (name.charAt(0) || "?").toUpperCase()
      )}
    </span>
  );
}
