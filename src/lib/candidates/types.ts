export const CANDIDATE_DIRECTORY_STATUSES = ["On campus", "Placed"] as const;
export type CandidateDirectoryStatus = (typeof CANDIDATE_DIRECTORY_STATUSES)[number];
export const DEFAULT_DIRECTORY_STATUS: CandidateDirectoryStatus = "On campus";

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

export function directoryStatusBadgeClass(status: CandidateDirectoryStatus): string {
  if (status === "Placed") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}
