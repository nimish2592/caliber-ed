"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, FileSearch, Plus, Users, Wallet } from "lucide-react";
import type { ClientListRow, PlatformUsageTotals } from "@/lib/db/admin";
import { formatUsd } from "@/utils/formatUsd";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientListRow[]>([]);
  const [totals, setTotals] = useState<PlatformUsageTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/institutions");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load clients.");
        setClients(data.institutions ?? []);
        setTotals(data.totals ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clients.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Organizations</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Create campus orgs, allocate CV analyses, add user emails, and activate or deactivate access.
            </p>
          </div>
          <Link
            href="/admin/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New organization
          </Link>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {totals && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Allocated</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totals.allocated.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">CV analyses across {totals.clients} client{totals.clients === 1 ? "" : "s"}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">CVs analysed</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totals.analysed.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Completed analyses</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Balance left</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{totals.remaining.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Unused allocation</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI cost</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatUsd(totals.aiCostUsd)}</p>
              <p className="text-xs text-slate-500 mt-1">Model scoring this year</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading organizations…</p>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center mb-5">
              <Building2 className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No organizations yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              Create a campus organization, allocate CV analyses, and add the first user by email.
            </p>
            <Link
              href="/admin/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" /> Provision first organization
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Allocated</th>
                  <th className="px-4 py-3 font-semibold">Analysed</th>
                  <th className="px-4 py-3 font-semibold">Left</th>
                  <th className="px-4 py-3 font-semibold">AI cost</th>
                  <th className="px-4 py-3 font-semibold">Users</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/admin/${client.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/${client.id}`} className="font-semibold text-slate-800 hover:text-blue-700">
                        {client.name}
                      </Link>
                      <p className="text-xs text-slate-400 capitalize">{client.plan} · {client.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          client.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {client.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{client.annual_limit.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <FileSearch className="w-3.5 h-3.5 text-slate-400" />
                        {client.cvs_analysed.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{client.remaining.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        {formatUsd(client.ai_cost_usd)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {client.user_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(client.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
