import { notFound } from "next/navigation";
import { getInstitution, resolvePublicGoal } from "@/lib/db/queries";
import StudentGoalUpload from "@/components/StudentGoalUpload";

export const dynamic = "force-dynamic";

export default async function PublicGoalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const goal = await resolvePublicGoal(slug);
  if (!goal) notFound();
  const institution = await getInstitution(goal.institution_id);

  return (
    <StudentGoalUpload
      goalSlug={goal.public_slug}
      goalTitle={goal.title}
      goalCode={goal.goal_code}
      institutionName={institution?.name ?? "Campus"}
      instructions={
        institution?.student_instructions ||
        "Upload your CV for a career-readiness assessment against this campus goal."
      }
    />
  );
}
