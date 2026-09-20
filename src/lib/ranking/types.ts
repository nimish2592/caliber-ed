export type ScoringWeights = {
  skills: number;
  experience: number;
  years: number;
  education: number;
  achievements: number;
  keywords: number;
  location: number;
};

export type DimensionScores = {
  skills_score: number;
  experience_score: number;
  years_score: number;
  education_score: number;
  achievements_score: number;
  keyword_score: number;
  location_score: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 35,
  experience: 25,
  years: 15,
  education: 10,
  achievements: 10,
  keywords: 5,
  location: 0,
};

export type HeRecommendation = "ready" | "developing" | "needs_work";
export type GoalStatus = "active" | "on_hold" | "closed";

export type RankingPayload = {
  candidate_name: string;
  file_name: string;
  score: number;
  scores: DimensionScores;
  matched_skills: string[];
  missing_skills: string[];
  highlights: string[];
  red_flags: string[];
  experience_match: "high" | "medium" | "low";
  recommendation: HeRecommendation;
  reason: string;
  mandatory_match_pct: number;
  critical_skills_missing: string[];
  experience_fit_status: string;
  overqualification_penalty: number;
  years_experience: number;
  candidate_location: string | null;
  location_match_status: string | null;
  resume_text: string;
  candidate_email: string | null;
};

export type RankedCv = RankingPayload & {
  id: string;
  status: string;
  created_at: string;
  ranked_at: string | null;
};
