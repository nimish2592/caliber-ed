import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function PresentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <div className="h-screen overflow-hidden bg-slate-900">{children}</div>;
}
