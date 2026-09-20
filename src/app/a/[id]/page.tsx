import { FileSearch } from "lucide-react";
import { AssessmentClient } from "@/components/AssessmentClient";
import { notFound } from "next/navigation";

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2.5 px-6 py-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Caliber</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Career readiness</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <AssessmentClient id={id} token={t} />
      </main>
    </div>
  );
}
