"use client";

import { useState } from "react";

export function SettingsForm({
  name,
  studentInstructions,
  retentionDays,
  showStudentIdentities,
  canEdit,
}: {
  name: string;
  studentInstructions: string;
  retentionDays: number;
  showStudentIdentities: boolean;
  canEdit: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/institutions/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        studentInstructions: form.get("studentInstructions"),
        retentionDays: Number(form.get("retentionDays")),
        showStudentIdentities: form.get("showStudentIdentities") === "on",
      }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Saved." : data.error || "Could not save");
  }

  const field = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Institution name
        <input name="name" defaultValue={name} disabled={!canEdit} className={field} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Student instructions
        <textarea name="studentInstructions" defaultValue={studentInstructions} disabled={!canEdit} rows={4} className={field} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Data retention (days)
        <input name="retentionDays" type="number" min={30} max={2555} defaultValue={retentionDays} disabled={!canEdit} className={field} />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="showStudentIdentities" type="checkbox" defaultChecked={showStudentIdentities} disabled={!canEdit} />
        Allow authorised staff to view individual student identities
      </label>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      {canEdit ? (
        <button type="submit" disabled={busy} className="w-full py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl">
          {busy ? "Saving…" : "Save settings"}
        </button>
      ) : (
        <p className="text-sm text-slate-400">Only admins can change these settings.</p>
      )}
    </form>
  );
}
