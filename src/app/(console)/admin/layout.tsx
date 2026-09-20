import { redirect } from "next/navigation";
import { canAccessAdmin, getSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!canAccessAdmin(session)) redirect("/");
  return children;
}
