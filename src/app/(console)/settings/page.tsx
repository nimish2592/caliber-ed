import { getSession } from "@/lib/auth/session";
import { getInstitution, getUsageStats } from "@/lib/db/queries";
import { SettingsForm } from "@/components/SettingsForm";
import UsageCard from "@/components/UsageCard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [institution, usage] = await Promise.all([
    getInstitution(session.institutionId),
    getUsageStats(session.institutionId),
  ]);
  if (!institution) redirect("/login");

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500 mt-1 text-sm">Usage, institution branding, and student-facing copy</p>
        </div>
        {usage ? <UsageCard usage={usage} /> : null}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ranking model</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {institution.is_demo
              ? "Heuristic (demo)"
              : institution.assessment_model || institution.assessment_engine}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {institution.is_demo
              ? "Demo scoring stays on the sample campus record and does not call a live model."
              : `This campus uses ${institution.assessment_engine}${institution.assessment_model ? ` / ${institution.assessment_model}` : ""}, stored on its database record.`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <SettingsForm
            name={institution.name}
            studentInstructions={institution.student_instructions}
            retentionDays={institution.retention_days}
            showStudentIdentities={institution.show_student_identities}
            canEdit={session.role === "admin" && session.institutionId === session.homeInstitutionId}
          />
        </div>
      </div>
    </main>
  );
}
