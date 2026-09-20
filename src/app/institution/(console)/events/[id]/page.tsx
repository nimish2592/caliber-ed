import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import type { DimensionKey } from "@/lib/assessment/types";
import { getDashboardStats, getEventById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/institution/login");
  const { id } = await params;
  const event = await getEventById(id, session.institutionId);
  if (!event) notFound();

  const url = `${appConfig.appUrl}/e/${event.public_slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: "#1c1712", light: "#f3eee4" } });
  const stats = await getDashboardStats(session.institutionId, event.id);
  const needingPct = stats.assessed ? Math.round((stats.needingImprovement / stats.assessed) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{event.public_code}</p>
        <h1 className="serif mt-1 text-4xl">{event.name}</h1>
        <p className="mt-2 text-muted">{event.instructions}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-line bg-white/70 p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for ${event.name}`} className="mx-auto" />
          <p className="mt-2 break-all text-xs text-muted">{url}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Students assessed</p>
            <p className="serif mt-2 text-3xl">{stats.assessed}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Average score</p>
            <p className="serif mt-2 text-3xl">{stats.averageScore ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Needing improvement</p>
            <p className="serif mt-2 text-3xl">{needingPct}%</p>
          </div>
        </div>
      </div>
      <section className="rounded-2xl border border-line bg-white/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Top weaknesses</h2>
        <ul className="mt-4 space-y-2">
          {stats.weaknesses.length ? (
            stats.weaknesses.map((w) => (
              <li key={w.dimension} className="flex justify-between text-sm">
                <span>{DIMENSION_LABELS[w.dimension as DimensionKey] ?? w.dimension}</span>
                <span>{w.pct}%</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted">No event assessments yet. Share the QR code with students.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
