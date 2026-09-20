import type { GoalStatus } from "../ranking/types";

export const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; dot: string; badge: string }> = {
  active:  { label: "Active",   dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  on_hold: { label: "On Hold",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  closed:  { label: "Closed",   dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const GOAL_STATUS_ORDER: GoalStatus[] = ["active", "on_hold", "closed"];
