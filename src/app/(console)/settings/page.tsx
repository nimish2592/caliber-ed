import { getSession } from "@/lib/auth/session";
import { getInstitution, getSubscription } from "@/lib/db/queries";
import { SettingsForm } from "@/components/SettingsForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [institution, sub] = await Promise.all([
    getInstitution(session.institutionId),
    getSubscription(session.institutionId),
  ]);
  if (!institution) redirect("/login");

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500 mt-1 text-sm">Institution branding and student-facing copy</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <SettingsForm
            name={institution.name}
            studentInstructions={institution.student_instructions}
            retentionDays={institution.retention_days}
            showStudentIdentities={institution.show_student_identities}
            canEdit={session.role === "admin"}
          />
        </div>
        {sub ? (
          <p className="text-sm text-slate-400">
            Subscription: {sub.plan} · {sub.assessments_used}/{sub.annual_limit} assessments this year.
          </p>
        ) : null}
      </div>
    </main>
  );
}
