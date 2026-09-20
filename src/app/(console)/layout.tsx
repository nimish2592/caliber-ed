import { redirect } from "next/navigation";
import { canAccessAdmin, getSession } from "@/lib/auth/session";
import AppSidebar from "@/components/AppSidebar";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <AppSidebar
        userEmail={session.email}
        isPlatform={session.platform}
        isDemo={session.demo}
        canAccessAdmin={canAccessAdmin(session)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {children}
      </div>
    </div>
  );
}
