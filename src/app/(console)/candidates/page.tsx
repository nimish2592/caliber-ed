"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Archive, ArchiveRestore, Building2, ChevronLeft, ChevronRight,
  Code2, Download, ExternalLink, GraduationCap, Link2, Loader2, Mail, Phone,
  RefreshCw, Search, Share2, Target, User, Users, X,
} from "lucide-react";
import type { CandidateDirectoryStatus, CandidateRow } from "@/lib/candidates/types";
import { CANDIDATE_DIRECTORY_STATUSES, directoryStatusBadgeClass } from "@/lib/candidates/types";
import type { RankedCv } from "@/lib/ranking/types";
import ShareCvModal from "@/components/ShareCvModal";
import TextViewerModal from "@/components/TextViewerModal";
import { downloadFromApi } from "@/utils/downloadFromApi";

const PAGE_SIZE = 20;

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${color}`}>
      {initials || <User className="w-4 h-4" />}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-slate-400 italic">—</span>;
  const color = score >= 75 ? "text-emerald-700 bg-emerald-100" : score >= 50 ? "text-amber-700 bg-amber-100" : "text-red-700 bg-red-100";
  return <div className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-sm ${color}`}>{score}</div>;
}

function CandidateDetailPanel({
  candidate,
  rankings,
  onClose,
  onArchiveToggle,
  onStatusChange,
  onViewCv,
  onShareCv,
  onDownloadCv,
  archiving,
  downloading,
}: {
  candidate: CandidateRow;
  rankings: RankedCv[];
  onClose: () => void;
  onArchiveToggle: () => void;
  onStatusChange: (status: CandidateDirectoryStatus) => void;
  onViewCv: (cv: RankedCv) => void;
  onShareCv: (cv: RankedCv) => void;
  onDownloadCv: () => void;
  archiving: boolean;
  downloading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={candidate.display_name} />
              <div>
                <p className="text-[10px] font-mono font-bold text-blue-600 mb-0.5">{candidate.candidate_code}</p>
                <h2 className="font-bold text-slate-900 text-base">{candidate.display_name || "Unknown"}</h2>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">{candidate.directory_status}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {candidate.profile_summary && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed italic">
              “{candidate.profile_summary}”
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
            <div className="space-y-1.5">
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {candidate.phone}
                </a>
              )}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800">
                  <Link2 className="w-3.5 h-3.5" /> {candidate.linkedin_url.replace("https://", "")}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {candidate.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900">
                  <Code2 className="w-3.5 h-3.5" /> {candidate.github_url.replace("https://", "")}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {!candidate.email && !candidate.phone && !candidate.linkedin_url && !candidate.github_url && (
                <p className="text-xs text-slate-400 italic">No contact details extracted</p>
              )}
            </div>
          </div>

          {(candidate.degree || candidate.college) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Education</p>
              <div className="flex items-start gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <div>
                  {candidate.degree && <p className="text-xs font-medium text-slate-700">{candidate.degree}</p>}
                  {candidate.college && <p className="text-xs text-slate-500 mt-0.5">{candidate.college}</p>}
                </div>
              </div>
            </div>
          )}

          {candidate.skills.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          {candidate.goals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Goals ranked for</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.goals.map((goal) => (
                  <span key={goal} className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-lg border border-violet-100">
                    <Target className="w-3 h-3 text-violet-400" /> {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.companies.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Internships / orgs</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.companies.map((c) => (
                  <span key={c} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-lg border border-slate-200">
                    <Building2 className="w-3 h-3 text-slate-400" /> {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {rankings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CV scores</p>
              <div className="space-y-1.5">
                {rankings.slice(0, 6).map((cv) => (
                  <button
                    key={cv.id}
                    type="button"
                    onClick={() => onViewCv(cv)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-left"
                  >
                    <span className="text-xs text-slate-600 truncate">{cv.file_name}</span>
                    <ScoreBadge score={cv.status === "completed" ? cv.score : null} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Status
            <select
              value={candidate.directory_status}
              onChange={(e) => onStatusChange(e.target.value as CandidateDirectoryStatus)}
              className={`mt-1.5 w-full text-xs font-semibold border rounded-lg px-2.5 py-2 ${directoryStatusBadgeClass(candidate.directory_status)}`}
            >
              {CANDIDATE_DIRECTORY_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{candidate.goals.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Goal{candidate.goals.length !== 1 ? "s" : ""} ranked</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{candidate.last_score ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5">Latest score</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onDownloadCv}
              disabled={downloading}
              className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download CV
            </button>
            <button
              type="button"
              onClick={() => {
                const ranked = rankings.find((cv) => cv.status === "completed");
                if (ranked) onShareCv(ranked);
              }}
              disabled={!rankings.some((cv) => cv.status === "completed")}
              className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          <button
            type="button"
            onClick={onArchiveToggle}
            disabled={archiving}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : candidate.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {candidate.archived ? "Restore to active" : "Archive candidate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [counts, setCounts] = useState({ active: 0, archived: 0 });
  const [archiveTab, setArchiveTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [rankings, setRankings] = useState<RankedCv[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [viewingCv, setViewingCv] = useState<RankedCv | null>(null);
  const [sharingCv, setSharingCv] = useState<RankedCv | null>(null);
  const [downloadingCv, setDownloadingCv] = useState(false);

  const load = useCallback(async (tab: "active" | "archived", q: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tab === "archived") params.set("archived", "1");
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/candidates?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load candidates.");
      setRows(data.rows ?? []);
      setCounts({ active: data.active ?? 0, archived: data.archived ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(archiveTab, appliedSearch);
  }, [archiveTab, appliedSearch, load]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  const openCandidate = async (row: CandidateRow) => {
    setSelected(row);
    setRankings([]);
    const res = await fetch(`/api/candidates/${row.id}`);
    const data = await res.json();
    if (res.ok) {
      setSelected(data.candidate);
      setRankings(data.rankings ?? []);
    }
  };

  const patchCandidate = async (id: string, body: Record<string, unknown>) => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed.");
      }
      setSelected(null);
      await load(archiveTab, appliedSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900">Candidates</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Students added automatically when a CV is uploaded against a goal
            </p>
          </div>
          <button
            onClick={() => void load(archiveTab, appliedSearch)}
            className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["active", "archived"] as const).map((tab) => {
            const selectedTab = archiveTab === tab;
            const count = tab === "active" ? counts.active : counts.archived;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => { setArchiveTab(tab); setPage(1); setSelected(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedTab
                    ? tab === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                      : "bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {tab === "active" ? <Users className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                {tab === "active" ? "Active" : "Archived"}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selectedTab ? "bg-white/70" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(search); setPage(1); } }}
              placeholder="Search by name, email, college, skill, or goal…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center mb-5">
              {archiveTab === "archived" ? <Archive className="w-7 h-7 text-slate-400" /> : <Users className="w-7 h-7 text-blue-400" />}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {archiveTab === "archived" ? "No archived candidates" : appliedSearch ? "No matching candidates" : "No candidates yet"}
            </h3>
            <p className="text-slate-500 text-sm max-w-xs">
              {archiveTab === "archived"
                ? "Archive moves a candidate out of the active list without deleting their data."
                : "Upload CVs from a Goal — or have students scan the QR — to populate this directory."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Candidate</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Education</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Skills</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Goals</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Last ranked</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => void openCandidate(c)}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${c.archived ? "opacity-75" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={c.display_name} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono font-bold text-blue-600">{c.candidate_code}</p>
                            <p className="font-semibold text-slate-800 text-sm truncate">{c.display_name || "Unknown"}</p>
                            {c.email ? <p className="text-xs text-slate-400 truncate">{c.email}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[180px]">{c.degree || "—"}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{c.college}</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.skills.slice(0, 3).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100">{s}</span>
                          ))}
                          {c.skills.length > 3 && <span className="text-[10px] text-slate-400">+{c.skills.length - 3}</span>}
                          {c.skills.length === 0 && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {c.goals.slice(0, 2).map((g) => (
                            <span key={g} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] rounded border border-violet-100 truncate max-w-full">{g}</span>
                          ))}
                          {c.goals.length > 2 && <span className="text-[10px] text-slate-400">+{c.goals.length - 2}</span>}
                          {c.goals.length === 0 && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <ScoreBadge score={c.last_score} />
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${directoryStatusBadgeClass(c.directory_status)}`}>
                          {c.directory_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell text-xs text-slate-500">
                        {formatDate(c.last_ranked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {rows.length} candidate{rows.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <CandidateDetailPanel
          candidate={selected}
          rankings={rankings}
          archiving={archiving}
          downloading={downloadingCv}
          onClose={() => setSelected(null)}
          onArchiveToggle={() => void patchCandidate(selected.id, { archived: !selected.archived })}
          onStatusChange={(status) => void patchCandidate(selected.id, { directoryStatus: status })}
          onViewCv={setViewingCv}
          onShareCv={setSharingCv}
          onDownloadCv={async () => {
            setDownloadingCv(true);
            setError("");
            try {
              await downloadFromApi(`/api/candidates/${selected.id}/cv`, selected.cv_file_name || "CV.pdf");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Download failed.");
            } finally {
              setDownloadingCv(false);
            }
          }}
        />
      )}
      {sharingCv && <ShareCvModal resume={sharingCv} onClose={() => setSharingCv(null)} />}
      {viewingCv && (
        <TextViewerModal
          title={viewingCv.candidate_name || "Candidate CV"}
          subtitle={viewingCv.file_name}
          text={viewingCv.resume_text}
          downloadUrl={`/api/assessments/${viewingCv.id}/cv`}
          downloadFileName={viewingCv.file_name}
          onClose={() => setViewingCv(null)}
        />
      )}
    </main>
  );
}
