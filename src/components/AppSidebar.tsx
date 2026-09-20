"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileSearch, LogOut, Settings, Shield, Target, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

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

const ADMIN_ITEM: NavItem = {
  key: "admin",
  href: "/admin",
  label: "Admin",
  icon: <Shield className="w-4 h-4" />,
  accent: "amber",
};

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
  isDemo = false,
  canAccessAdmin = false,
}: {
  userEmail: string;
  isPlatform?: boolean;
  isDemo?: boolean;
  canAccessAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeTab(pathname);
  const items: NavItem[] = canAccessAdmin ? [...CAMPUS_ITEMS, ADMIN_ITEM] : CAMPUS_ITEMS;
  const [switching, setSwitching] = useState(false);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function onWorkspaceMode(mode: "demo" | "live") {
    if (switching) return;
    if (mode === "demo" && isDemo) return;
    if (mode === "live" && !isDemo) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not switch data.");
      }
      if (pathname.startsWith("/admin")) {
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setSwitching(false);
      return;
    }
    setSwitching(false);
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
              {isDemo ? "Demo workspace" : isPlatform ? "Platform admin" : "Higher education"}
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

      <div className="px-3 py-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
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
        <div className="px-2 pt-1">
          <p className="px-0.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Data
          </p>
          <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-lg bg-slate-100">
            <button
              type="button"
              disabled={switching}
              onClick={() => void onWorkspaceMode("demo")}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                isDemo
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Demo
            </button>
            <button
              type="button"
              disabled={switching}
              onClick={() => void onWorkspaceMode("live")}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                !isDemo
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Live
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
