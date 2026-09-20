"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Target, Users, Eye, Upload, AlertCircle, Calendar, Hash,
  RefreshCw, Search, ChevronLeft, ChevronRight, User, Clock, Filter, Check,
} from "lucide-react";
import { GOAL_STATUS_CONFIG, GOAL_STATUS_ORDER } from "@/lib/goals/status";
import type { GoalRow } from "@/lib/db/queries";
import type { GoalStatus } from "@/lib/ranking/types";

const PAGE_SIZE = 10;
const DEFAULT_STATUS_FILTERS: GoalStatus[] = ["active"];

type SortField = "created_at" | "goal_code" | "title" | "cv_count";
type SortDir = "asc" | "desc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EmptyState({ onCreate, isFiltered }: { onCreate: () => void; isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center mb-5">
        <Target className="w-7 h-7 text-blue-400" />
      </div>
      {isFiltered ? (
        <>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No results found</h3>
          <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Goals yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Create a higher-education goal, then share the QR or upload student CVs.
          </p>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Create First Goal
          </button>
        </>
      )}
    </div>
  );
}

export default function GoalsDashboardPage() {
  const router = useRouter();
  const [allGoals, setAllGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<GoalStatus[]>(DEFAULT_STATUS_FILTERS);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const loadGoals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load goals.");
      setAllGoals(data.goals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadGoals(); }, []);
  useEffect(() => { setPage(1); }, [statusFilters, search, sortField, sortDir]);

  const toggleStatusFilter = (status: GoalStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const isDefaultStatusFilter =
    statusFilters.length === DEFAULT_STATUS_FILTERS.length &&
    DEFAULT_STATUS_FILTERS.every((s) => statusFilters.includes(s));

  const statusCounts = useMemo(() => {
    const counts: Record<GoalStatus, number> = { active: 0, on_hold: 0, closed: 0 };
    for (const goal of allGoals) counts[goal.status] += 1;
    return counts;
  }, [allGoals]);

  const filtered = useMemo(() => {
    let list = allGoals.filter((g) => statusFilters.includes(g.status));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.goal_code.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q) ||
          g.created_by.toLowerCase().includes(q) ||
          g.focus_skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    list = [...list].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;
      if (sortField === "created_at") { aVal = a.created_at; bVal = b.created_at; }
      else if (sortField === "goal_code") { aVal = a.goal_code; bVal = b.goal_code; }
      else if (sortField === "title") { aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); }
      else if (sortField === "cv_count") { aVal = a.cv_count ?? 0; bVal = b.cv_count ?? 0; }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [allGoals, statusFilters, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleStatusChange = async (goal: GoalRow, status: GoalStatus) => {
    setActingId(goal.id);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status.");
      }
      setAllGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status } : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setActingId(null);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className={`ml-1 text-slate-400 ${sortField === field ? "text-blue-500" : ""}`}>
      {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-start gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900">Goals</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Higher-education context, focus skills, and student CV rankings
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => void loadGoals()}
              className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/goals/new")}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Create New Goal
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_STATUS_ORDER.map((status) => {
                  const cfg = GOAL_STATUS_CONFIG[status];
                  const selected = statusFilters.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatusFilter(status)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selected ? `${cfg.badge} shadow-sm` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${selected ? "border-current bg-white/80" : "border-slate-300 bg-white"}`}>
                        {selected && <Check className="w-2 h-2" strokeWidth={3} />}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selected ? "bg-white/60" : "bg-slate-100 text-slate-500"}`}>
                        {statusCounts[status]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!isDefaultStatusFilter && (
                <button type="button" onClick={() => setStatusFilters(DEFAULT_STATUS_FILTERS)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, goal ID, creator, or skill..."
                className="flex-1 text-xs text-slate-700 bg-transparent outline-none placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={`${sortField}-${sortDir}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("-") as [SortField, SortDir];
                  setSortField(f); setSortDir(d);
                }}
                className="text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="created_at-desc">Newest first</option>
                <option value="created_at-asc">Oldest first</option>
                <option value="goal_code-asc">Goal ID A–Z</option>
                <option value="title-asc">Title A–Z</option>
                <option value="cv_count-desc">Most CVs</option>
              </select>
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {filtered.length === 0 ? "No results" : `${filtered.length} goal${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => router.push("/goals/new")} isFiltered={!!search || !isDefaultStatusFilter} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort("goal_code")}>
                      Goal ID <SortIcon field="goal_code" />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort("title")}>
                      Goal <SortIcon field="title" />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort("created_at")}>
                      Created <SortIcon field="created_at" />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Created By</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Focus Skills</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort("cv_count")}>
                      CVs <SortIcon field="cv_count" />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((goal) => (
                    <tr
                      key={goal.id}
                      onClick={() => router.push(`/goals/${goal.id}`)}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${goal.status === "closed" ? "opacity-75" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="font-mono font-bold text-blue-600 text-sm">{goal.goal_code}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{goal.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Higher-education context</p>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(goal.created_at)}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <Clock className="w-3 h-3" />
                            {new Date(goal.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {goal.created_by ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="text-xs text-slate-600 truncate max-w-[140px]" title={goal.created_by}>{goal.created_by}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {goal.focus_skills.slice(0, 3).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">{s}</span>
                          ))}
                          {goal.focus_skills.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">+{goal.focus_skills.length - 3}</span>
                          )}
                          {goal.focus_skills.length === 0 && <span className="text-xs text-slate-400 italic">None set</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-medium text-slate-700">{goal.cv_count ?? 0}</span>
                          <span className="hidden sm:inline">CV{(goal.cv_count ?? 0) !== 1 ? "s" : ""}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <select
                          value={goal.status}
                          disabled={actingId === goal.id}
                          onChange={(e) => handleStatusChange(goal, e.target.value as GoalStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs font-semibold border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${GOAL_STATUS_CONFIG[goal.status].badge}`}
                        >
                          {GOAL_STATUS_ORDER.map((val) => (
                            <option key={val} value={val}>{GOAL_STATUS_CONFIG[val].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/goals/${goal.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <Link
                            href={`/goals/${goal.id}/upload`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" /> CVs
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} · showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
