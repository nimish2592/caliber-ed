import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getGoalById } from "@/lib/db/queries";
import GoalQrOverlay from "@/components/GoalQrOverlay";

export const dynamic = "force-dynamic";

export default async function GoalQrPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) notFound();
  const { id } = await params;
  const goal = await getGoalById(id, session.institutionId);
  if (!goal) notFound();

  return <GoalQrOverlay goalId={goal.id} goalTitle={goal.title} />;
}
