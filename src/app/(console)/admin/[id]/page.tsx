"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, FileSearch, Loader2, Power, PowerOff, UserPlus, Wallet } from "lucide-react";
import Header from "@/components/Header";
import type { ClientListRow, ProvisionedUserRow } from "@/lib/db/admin";
import { formatUsd } from "@/utils/formatUsd";

const PLANS = [
  { id: "starter", limit: 250 },
  { id: "institution", limit: 500 },
  { id: "campus", limit: 1000 },
  { id: "enterprise", limit: 2500 },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientListRow | null>(null);
  const [users, setUsers] = useState<ProvisionedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [allocationSaved, setAllocationSaved] = useState(false);
  const [annualLimit, setAnnualLimit] = useState("");
  const [plan, setPlan] = useState("institution");
  const [issued, setIssued] = useState<{ name: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/institutions/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load client.");
      const institution = data.institution as ClientListRow;
      setClient(institution);
      setUsers(data.users ?? []);
      setAnnualLimit(String(institution.annual_limit));
      setPlan(institution.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onSaveAllocation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingAllocation(true);
    setError("");
    setAllocationSaved(false);
    const res = await fetch(`/api/admin/institutions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annualLimit: Number(annualLimit),
        plan,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update allocation.");
      setSavingAllocation(false);
      return;
    }
    const institution = data.institution as ClientListRow;
    setClient(institution);
    setAnnualLimit(String(institution.annual_limit));
    setPlan(institution.plan);
    setAllocationSaved(true);
    setSavingAllocation(false);
    setTimeout(() => setAllocationSaved(false), 2000);
  }

  async function onAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setIssued(null);
    const form = e.currentTarget;
    const body = new FormData(form);
    const res = await fetch(`/api/admin/institutions/${id}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.get("name"),
        email: body.get("email"),
        role: body.get("role"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add this user.");
      setBusy(false);
      return;
    }
    setIssued({
      name: data.user.display_name,
      email: data.user.email,
    });
    form.reset();
    setBusy(false);
    await load();
  }

  async function onToggleOrgActive() {
    if (!client) return;
    const next = !client.active;
    if (
      !confirm(
        next
          ? `Activate “${client.name}”? Users can sign in again.`
          : `Deactivate “${client.name}”? All users lose access until the organization is active again.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/institutions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update organization.");
      setBusy(false);
      return;
    }
    setClient(data.institution);
    setBusy(false);
  }

  async function onToggleUserActive(user: ProvisionedUserRow) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/institutions/${id}/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, active: !user.active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update user.");
      setBusy(false);
      return;
    }
    setBusy(false);
    await load();
  }

  async function copyLogin() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Header
        onBack={() => router.push("/admin")}
        backLabel="Organizations"
        title={client?.name ?? "Organization"}
        subtitle={
          client
            ? `${client.active ? "Active" : "Inactive"} · ${client.plan} · ${client.cvs_analysed.toLocaleString()} analysed · ${client.remaining.toLocaleString()} left`
            : undefined
        }
      />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {client && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Organization status</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inactive organizations cannot sign in, even if individual users are active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onToggleOrgActive()}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border ${
                  client.active
                    ? "border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                    : "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                }`}
              >
                {client.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {client.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          )}

          {client && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Allocated</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{client.annual_limit.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">CV analyses this year</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">CVs analysed</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{client.cvs_analysed.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                  <FileSearch className="w-3.5 h-3.5" /> Completed
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Balance left</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{client.remaining.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Unused allocation</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI cost</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{formatUsd(client.ai_cost_usd)}</p>
                <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" /> Model scoring
                </p>
              </div>
            </div>
          )}

          <form onSubmit={onSaveAllocation} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Allocate CV analyses</h3>
            <p className="text-sm text-slate-500">
              Set how many CVs this campus can analyse this year. Remaining balance is allocation minus completed analyses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                Allocated number
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  required
                  value={annualLimit}
                  onChange={(e) => setAnnualLimit(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Plan
                <select
                  value={plan}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPlan(next);
                    const match = PLANS.find((p) => p.id === next);
                    if (match && (!annualLimit || PLANS.some((p) => String(p.limit) === annualLimit))) {
                      setAnnualLimit(String(match.limit));
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.limit.toLocaleString()} default
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={savingAllocation || loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center gap-2"
            >
              {savingAllocation ? <Loader2 className="w-4 h-4 animate-spin" /> : allocationSaved ? <Check className="w-4 h-4" /> : null}
              {allocationSaved ? "Saved" : "Save allocation"}
            </button>
          </form>

          {issued && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {issued.name} can sign in with Google
                </p>
                <p className="text-sm text-emerald-800 mt-1">{issued.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void copyLogin()}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium text-emerald-800"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Users</h3>
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500">No users on this organization yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="pb-2 font-semibold">Name</th>
                    <th className="pb-2 font-semibold">Email</th>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Added</th>
                    <th className="pb-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="py-2.5 font-medium text-slate-800">{user.display_name}</td>
                      <td className="py-2.5 text-slate-600">{user.email}</td>
                      <td className="py-2.5 capitalize text-slate-500">{user.role}</td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                            user.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{formatDate(user.created_at)}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onToggleUserActive(user)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                            user.active
                              ? "text-amber-700 hover:bg-amber-50"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {user.active ? (
                            <>
                              <PowerOff className="w-3.5 h-3.5" /> Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="w-3.5 h-3.5" /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <form onSubmit={onAddUser} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Add a user</h3>
            </div>
            <p className="text-sm text-slate-500">
              Enter their name and the Google email they will use to sign in.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                Name
                <input
                  name="name"
                  required
                  placeholder="Alex Chen"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="alex@gmail.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700 max-w-xs">
              Role
              <select
                name="role"
                defaultValue="staff"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add user
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
