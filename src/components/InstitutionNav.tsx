import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function InstitutionNav({
  email,
  institutionName,
}: {
  email: string;
  institutionName: string;
}) {
  return (
    <header className="border-b border-line bg-white/50">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <BrandMark compact />
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/institution" className="hover:text-ink">
              Overview
            </Link>
            <Link href="/institution/events" className="hover:text-ink">
              Events
            </Link>
            <Link href="/institution/settings" className="hover:text-ink">
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{institutionName}</span>
          <span className="text-muted">{email}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
