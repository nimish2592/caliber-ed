"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileSearch, LogOut, Settings, Shield, Target, Users } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarTab = "admin" | "goals" | "candidates" | "settings";

type NavItem = {
  key: SidebarTab;
  href: string;
  label: string;
  icon: ReactNode;
  accent: "blue" | "violet" | "emerald" | "amber";
};

const CAMPUS_ITEMS: NavItem[] = [
  { key: "goals", href: "/", label: "Goals", icon: <Target className="w-4 h-4" />, accent: "blue" },
  { key: "candidates", href: "/candidates", label: "Candidates", icon: <Users className="w-4 h-4" />, accent: "emerald" },
  { key: "settings", href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" />, accent: "violet" },
];

function activeClass(active: boolean, accent: string): string {
  if (!active) return "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
  if (accent === "violet") return "bg-violet-50 text-violet-700 border-violet-200";
  if (accent === "emerald") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (accent === "amber") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function activeTab(pathname: string): SidebarTab {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/candidates")) return "candidates";
  return "goals";
}

export default function AppSidebar({
  userEmail,
  isPlatform = false,
}: {
  userEmail: string;
  isPlatform?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeTab(pathname);
  const items: NavItem[] = isPlatform
    ? [
        { key: "admin", href: "/admin", label: "Admin", icon: <Shield className="w-4 h-4" />, accent: "amber" },
        ...CAMPUS_ITEMS,
      ]
    : CAMPUS_ITEMS;

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen">
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 flex-shrink-0">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Caliber</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isPlatform ? "Platform admin" : "Higher education"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Modules
        </p>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-transparent transition-colors ${activeClass(active === item.key, item.accent)}`}
          >
            {item.icon}
            <span className="text-left">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold text-xs">
              {userEmail[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <button
            onClick={() => void onLogout()}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
