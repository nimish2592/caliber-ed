import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getInstitution, getUsageStats } from "@/lib/db/queries";
import { SettingsForm } from "@/components/SettingsForm";
import UsageCard from "@/components/UsageCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/institution/login");
  const [institution, usage] = await Promise.all([
    getInstitution(session.institutionId),
    getUsageStats(session.institutionId),
  ]);
  if (!institution) redirect("/institution/login");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Admin</p>
        <h1 className="serif mt-1 text-4xl">Institution settings</h1>
      </div>
      {usage ? <UsageCard usage={usage} /> : null}
      <SettingsForm
        name={institution.name}
        studentInstructions={institution.student_instructions}
        retentionDays={institution.retention_days}
        showStudentIdentities={institution.show_student_identities}
        canEdit={session.role === "admin" && session.institutionId === session.homeInstitutionId}
      />
    </div>
  );
}
