"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import Header from "@/components/Header";

const PLANS = [
  { id: "starter", limit: 250 },
  { id: "institution", limit: 500 },
  { id: "campus", limit: 1000 },
  { id: "enterprise", limit: 2500 },
] as const;

export default function NewClientPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<(typeof PLANS)[number]["id"]>("institution");
  const [annualLimit, setAnnualLimit] = useState(String(PLANS[1].limit));
  const [limitTouched, setLimitTouched] = useState(false);
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        plan: form.get("plan"),
        annualLimit: Number(form.get("annualLimit")),
        user: {
          name: form.get("userName"),
          email: form.get("userEmail"),
          role: form.get("role"),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not provision this client.");
      setBusy(false);
      return;
    }
    setCreated({
      id: data.institution.id,
      name: data.user.display_name,
      email: data.user.email,
      tempPassword: data.tempPassword,
    });
    setBusy(false);
  }

  async function copyPassword() {
    if (!created) return;
    await navigator.clipboard.writeText(`${created.email}\n${created.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Header onBack={() => router.push("/admin")} backLabel="Clients" title="New client" />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-8">
          {created ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Client provisioned</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {created.name} can sign in with Gmail ({created.email}) or this one-time password.
                  Copy it now — it will not be shown again.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <p><span className="text-slate-400">Email</span> · {created.email}</p>
                <p className="font-mono text-slate-800">{created.tempPassword}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy login"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/${created.id}`)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm"
                >
                  Add more users
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <h2 className="text-lg font-bold text-slate-900">Provision a client</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Create the campus workspace, then add the first person who should be able to log in.
                </p>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Client name
                <input
                  name="name"
                  required
                  placeholder="Demo University"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Plan
                <select
                  name="plan"
                  value={plan}
                  onChange={(e) => {
                    const next = e.target.value as (typeof PLANS)[number]["id"];
                    setPlan(next);
                    const match = PLANS.find((p) => p.id === next);
                    if (match && !limitTouched) setAnnualLimit(String(match.limit));
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.limit.toLocaleString()} assessments / year
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Allocated CV analyses
                <input
                  name="annualLimit"
                  type="number"
                  min={1}
                  max={1000000}
                  required
                  value={annualLimit}
                  onChange={(e) => {
                    setLimitTouched(true);
                    setAnnualLimit(e.target.value);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  This campus can run this many analyses this year. You can change it later from the client page.
                </span>
              </label>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">First user</p>
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    name="userName"
                    required
                    placeholder="Priya Sharma"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    name="userEmail"
                    type="email"
                    required
                    placeholder="priya@university.edu"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    name="role"
                    defaultValue="admin"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Provisioning…
                  </>
                ) : (
                  "Provision client"
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
