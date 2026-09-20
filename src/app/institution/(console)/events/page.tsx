import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getDashboardStats, listEvents } from "@/lib/db/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect("/institution/login");
  const events = await listEvents(session.institutionId);

  const withStats = await Promise.all(
    events.map(async (event) => ({
      event,
      stats: await getDashboardStats(session.institutionId, event.id),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Events</p>
          <h1 className="serif mt-1 text-4xl">Career fairs & campaigns</h1>
        </div>
        <Link
          href="/institution/events/new"
          className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Create event
        </Link>
      </div>
      <ul className="space-y-3">
        {withStats.map(({ event, stats }) => (
          <li key={event.id}>
            <Link
              href={`/institution/events/${event.id}`}
              className="flex items-center justify-between rounded-2xl border border-line bg-white/70 px-5 py-4 hover:border-teal"
            >
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-muted">
                  {event.public_code} · /e/{event.public_slug}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>{stats.assessed} assessed</p>
                <p className="text-muted">Avg {stats.averageScore ?? "—"}</p>
              </div>
            </Link>
          </li>
        ))}
        {events.length === 0 ? (
          <li className="text-sm text-muted">No events yet. Create one to generate a QR code and student link.</li>
        ) : null}
      </ul>
    </div>
  );
}
