"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({ eventSlug, cta = "Analyze My CV" }: { eventSlug?: string; cta?: string }) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/assessments", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      router.push(`/a/${data.id}?t=${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {eventSlug ? <input type="hidden" name="eventSlug" value={eventSlug} /> : null}
      <label className="block rounded-2xl border border-dashed border-line bg-white/70 px-5 py-8 text-center cursor-pointer hover:border-teal transition-colors">
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <p className="text-sm font-medium">Drop your CV here, or click to choose a file</p>
        <p className="mt-1 text-sm text-muted">PDF or DOCX · up to 8 MB</p>
        {fileName ? <p className="mt-3 text-sm text-teal-2">{fileName}</p> : null}
      </label>
      {error ? <p className="text-sm text-[#8f3d2c]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-teal px-6 py-3 text-sm font-semibold text-white hover:bg-teal-2 disabled:opacity-60"
      >
        {busy ? "Analyzing your CV…" : cta}
      </button>
    </form>
  );
}
