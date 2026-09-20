"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        instructions: form.get("instructions"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create event");
      setBusy(false);
      return;
    }
    router.push(`/institution/events/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <h1 className="serif text-4xl">Create event</h1>
      <label className="block text-sm">
        Event name
        <input
          name="name"
          required
          placeholder="ABC University Career Fair 2026"
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Student instructions
        <textarea
          name="instructions"
          rows={4}
          placeholder="Scan the QR code, upload your CV, and review your career-readiness score."
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-[#8f3d2c]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
