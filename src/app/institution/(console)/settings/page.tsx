import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getInstitution, getSubscription } from "@/lib/db/queries";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/institution/login");
  const [institution, sub] = await Promise.all([
    getInstitution(session.institutionId),
    getSubscription(session.institutionId),
  ]);
  if (!institution) redirect("/institution/login");

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Admin</p>
        <h1 className="serif mt-1 text-4xl">Institution settings</h1>
      </div>
      <SettingsForm
        name={institution.name}
        studentInstructions={institution.student_instructions}
        retentionDays={institution.retention_days}
        showStudentIdentities={institution.show_student_identities}
        canEdit={session.role === "admin"}
      />
      {sub ? (
        <p className="text-sm text-muted">
          Subscription: {sub.plan} · {sub.assessments_used}/{sub.annual_limit} assessments this year.
          Limits can be changed later without rebuilding the product.
        </p>
      ) : null}
    </div>
  );
}
