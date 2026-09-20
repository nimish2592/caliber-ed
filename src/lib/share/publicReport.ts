import type { RankingPayload } from "@/lib/ranking/types";

export type PublicShareReport = {
  candidateName: string;
  fileName: string;
  goalTitle: string;
  goalCode: string;
  score: number | null;
  grade: string | null;
  recommendation: RankingPayload["recommendation"] | null;
  reason: string;
  scores: RankingPayload["scores"] | null;
  matchedSkills: string[];
  missingSkills: string[];
  highlights: string[];
  redFlags: string[];
  canDownloadCv: boolean;
  goalFit: RankingPayload["goal_fit"] | null;
};

export function publicShareReport(params: {
  ranking: RankingPayload | null;
  candidateName: string;
  fileName: string;
  goalTitle: string;
  goalCode: string;
  score: number | null;
  canDownloadCv: boolean;
}): PublicShareReport {
  const ranking = params.ranking;
  return {
    candidateName: ranking?.candidate_name || params.candidateName || "Student",
    fileName: ranking?.file_name || params.fileName || "CV",
    goalTitle: params.goalTitle,
    goalCode: params.goalCode,
    score: ranking?.score ?? params.score,
    grade: ranking?.grade ?? null,
    recommendation: ranking?.recommendation ?? null,
    reason: ranking?.reason || "",
    scores: ranking?.scores ?? null,
    matchedSkills: ranking?.matched_skills ?? [],
    missingSkills: ranking?.missing_skills ?? [],
    highlights: ranking?.highlights ?? [],
    redFlags: ranking?.red_flags ?? [],
    canDownloadCv: params.canDownloadCv,
    goalFit: ranking?.goal_fit ?? null,
  };
}
