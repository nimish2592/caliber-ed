import { getSession } from "@/lib/auth/session";
import { getDashboardStats, getInstitution, getSubscription } from "@/lib/db/queries";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import type { DimensionKey } from "@/lib/assessment/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstitutionDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/institution/login");
  const [institution, stats, sub] = await Promise.all([
    getInstitution(session.institutionId),
    getDashboardStats(session.institutionId),
    getSubscription(session.institutionId),
  ]);

  const needingPct = stats.assessed ? Math.round((stats.needingImprovement / stats.assessed) * 100) : 0;
  const maxBar = Math.max(1, ...stats.distribution.map((d) => d.count));

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Overview</p>
        <h1 className="serif mt-1 text-4xl">{institution?.name}</h1>
        <p className="mt-2 text-muted">
          Aggregate career-readiness insights. Individual student files stay private
          {institution?.show_student_identities
            ? " unless your team opens an authorised view."
            : "."}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students assessed" value={stats.assessed.toLocaleString()} />
        <Stat label="Average CV score" value={stats.averageScore == null ? "—" : `${stats.averageScore} / 100`} />
        <Stat label="Assessments" value={stats.assessed.toLocaleString()} />
        <Stat label="Students needing improvement" value={`${needingPct}%`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Score distribution</h2>
          <ul className="mt-4 space-y-3">
            {stats.distribution.map((row) => (
              <li key={row.bucket}>
                <div className="flex justify-between text-sm">
                  <span>{row.bucket}</span>
                  <span>{row.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper-2">
                  <div
                    className="h-2 rounded-full bg-teal"
                    style={{ width: `${(row.count / maxBar) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Common weaknesses</h2>
          <ul className="mt-4 space-y-3">
            {stats.weaknesses.length ? (
              stats.weaknesses.map((w) => (
                <li key={w.dimension} className="flex justify-between text-sm">
                  <span>
                    {DIMENSION_LABELS[w.dimension as DimensionKey] ?? w.dimension}
                  </span>
                  <span>{w.pct}%</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">Assessments will appear here after students upload CVs.</li>
            )}
          </ul>
        </div>
      </section>

      {sub ? (
        <p className="text-sm text-muted">
          Plan {sub.plan} · {sub.assessments_used} of {sub.annual_limit} assessments used this year · renews{" "}
          {sub.renewal_date}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="serif mt-2 text-3xl">{value}</p>
    </div>
  );
}
