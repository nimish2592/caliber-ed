"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Plus, Users } from "lucide-react";
import type { ClientListRow } from "@/lib/db/admin";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientListRow[]>([]);
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
            <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Provision a campus, then add people by name so they can sign in with Gmail or email.
            </p>
          </div>
          <Link
            href="/admin/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New client
          </Link>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading clients…</p>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center mb-5">
              <Building2 className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No clients yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              Create a campus client and add the first user by name and email. They can then log in.
            </p>
            <Link
              href="/admin/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" /> Provision first client
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Users</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
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
                      <p className="font-semibold text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.slug}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{client.plan}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {client.user_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(client.created_at)}</td>
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
