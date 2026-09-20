import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-baseline gap-2 text-ink no-underline">
      <span className="serif text-xl tracking-tight">Caliber</span>
      {!compact && <span className="text-xs uppercase tracking-[0.18em] text-muted">Higher Ed</span>}
    </Link>
  );
}
