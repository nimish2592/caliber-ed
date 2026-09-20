"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, Loader2, UserPlus } from "lucide-react";
import Header from "@/components/Header";
import type { ClientListRow, ProvisionedUserRow } from "@/lib/db/admin";

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
  const [issued, setIssued] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/institutions/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load client.");
      setClient(data.institution);
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

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
      tempPassword: data.tempPassword,
    });
    form.reset();
    setBusy(false);
    await load();
  }

  async function copyLogin() {
    if (!issued) return;
    await navigator.clipboard.writeText(`${issued.email}\n${issued.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Header
        onBack={() => router.push("/admin")}
        backLabel="Clients"
        title={client?.name ?? "Client"}
        subtitle={client ? `${client.plan} · ${client.user_count} users` : undefined}
      />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {issued && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {issued.name} can log in now
                </p>
                <p className="text-sm text-emerald-800 mt-1">
                  Gmail or email: {issued.email}
                </p>
                <p className="font-mono text-sm text-emerald-950 mt-1">{issued.tempPassword}</p>
                <p className="text-xs text-emerald-700 mt-2">Copy this password now — it is only shown once.</p>
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
              <p className="text-sm text-slate-500">No users on this client yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="pb-2 font-semibold">Name</th>
                    <th className="pb-2 font-semibold">Email</th>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="py-2.5 font-medium text-slate-800">{user.display_name}</td>
                      <td className="py-2.5 text-slate-600">{user.email}</td>
                      <td className="py-2.5 capitalize text-slate-500">{user.role}</td>
                      <td className="py-2.5 text-slate-400">{formatDate(user.created_at)}</td>
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
              Enter their name and the email they will use to sign in (Gmail or campus email).
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
                  placeholder="alex@university.edu"
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
