export const CANDIDATE_DIRECTORY_STATUSES = [
  "On campus",
  "Developing",
  "Ready",
  "Needs work",
  "Placed",
] as const;
export type CandidateDirectoryStatus = (typeof CANDIDATE_DIRECTORY_STATUSES)[number];
export const DEFAULT_DIRECTORY_STATUS: CandidateDirectoryStatus = "On campus";

export const CANDIDATE_READINESS = ["ready", "developing", "needs_work"] as const;
export type CandidateReadiness = (typeof CANDIDATE_READINESS)[number];

export type CandidateRow = {
  id: string;
  institution_id: string;
  candidate_code: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  degree: string | null;
  college: string | null;
  profile_summary: string | null;
  skills: string[];
  companies: string[];
  goals: string[];
  years_experience: number;
  cv_file_name: string | null;
  document_id: string | null;
  content_hash: string | null;
  last_score: number | null;
  last_recommendation: string | null;
  last_ranked_at: string | null;
  directory_status: CandidateDirectoryStatus;
  archived: boolean;
  student_id: string | null;
  created_at: string;
  updated_at: string;
  goal_count?: number;
};

export function normalizeDirectoryStatus(value: unknown): CandidateDirectoryStatus {
  if (typeof value === "string" && (CANDIDATE_DIRECTORY_STATUSES as readonly string[]).includes(value)) {
    return value as CandidateDirectoryStatus;
  }
  return DEFAULT_DIRECTORY_STATUS;
}

export function directoryStatusBadgeClass(status: CandidateDirectoryStatus): string {
  if (status === "Placed") return "bg-slate-100 text-slate-600 border-slate-200";
  if (status === "Ready") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Developing") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "Needs work") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function readinessLabel(value: string | null | undefined): string {
  if (value === "ready") return "Ready";
  if (value === "developing") return "Developing";
  if (value === "needs_work") return "Needs work";
  return "—";
}

export function readinessBadgeClass(value: string | null | undefined): string {
  if (value === "ready") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "developing") return "bg-amber-50 text-amber-700 border-amber-200";
  if (value === "needs_work") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}
