import { BarChart3, CircleDollarSign, FileSearch } from "lucide-react";
import type { UsageStats } from "@/lib/db/queries";

function planLabel(plan: string): string {
  if (!plan) return "Plan";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function UsageCard({ usage }: { usage: UsageStats }) {
  const bar =
    usage.remaining === 0
      ? "bg-red-500"
      : usage.percentUsed >= 80
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Usage</h2>
          <p className="text-xs text-slate-500 mt-1">
            {planLabel(usage.plan)} plan · renews {formatDay(usage.renewalDate)}
          </p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          This period
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FileSearch className="w-3.5 h-3.5" />
            CVs analysed
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900">{usage.analysed.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Completed CV analyses</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <CircleDollarSign className="w-3.5 h-3.5" />
            Balance left
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900">{usage.remaining.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">CV analyses remaining</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <BarChart3 className="w-3.5 h-3.5" />
            Annual allowance
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900">{usage.annualLimit.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{usage.percentUsed}% used</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>
            {usage.analysed.toLocaleString()} of {usage.annualLimit.toLocaleString()} used
          </span>
          <span className="font-semibold text-slate-700">
            {usage.remaining.toLocaleString()} left
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${bar}`}
            style={{ width: `${usage.percentUsed}%` }}
          />
        </div>
      </div>
    </section>
  );
}
