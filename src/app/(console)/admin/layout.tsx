import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.platform) redirect("/");
  return children;
}
