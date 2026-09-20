import { extractStructuredCv } from "@/lib/assessment/extractStructured";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import {
  QUALITY_CHECK_KEYS,
  qualityAverage,
  qualityChecksFromDimensions,
  scoreQualityChecks,
  type QualityChecks,
} from "@/lib/assessment/qualityChecks";
import type { RankingPayload } from "@/lib/ranking/types";

export type StudentReportDimension = {
  key: string;
  label: string;
  score: number;
  status?: string;
  evidence: string;
};

export type StudentReportRecommendation = {
  priority: string;
  title: string;
  detail: string;
};

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
  qualityChecks: QualityChecks | null;
  qualityAverage: number | null;
  dimensions: StudentReportDimension[];
  recommendations: StudentReportRecommendation[];
  generatedAt: string;
  institutionName: string;
};

function hasQualityScores(checks?: QualityChecks | null): checks is QualityChecks {
  if (!checks) return false;
  return QUALITY_CHECK_KEYS.some((key) => (checks[key]?.score ?? 0) > 0 || Boolean(checks[key]?.evidence));
}

export function resolveQualityChecks(params: {
  ranking: RankingPayload | null;
  dimensions?: StudentReportDimension[];
}): QualityChecks | null {
  const ranking = params.ranking;
  if (hasQualityScores(ranking?.quality_checks)) return ranking.quality_checks;
  if (params.dimensions?.length) {
    const fromDims = qualityChecksFromDimensions(params.dimensions);
    if (hasQualityScores(fromDims)) return fromDims;
  }
  const text = ranking?.resume_text?.trim();
  if (text && text.length > 40) {
    return scoreQualityChecks(extractStructuredCv(text), text);
  }
  return null;
}

export function publicShareReport(params: {
  ranking: RankingPayload | null;
  candidateName: string;
  fileName: string;
  goalTitle: string;
  goalCode: string;
  score: number | null;
  canDownloadCv: boolean;
  institutionName?: string;
  dimensions?: StudentReportDimension[];
  recommendations?: StudentReportRecommendation[];
}): PublicShareReport {
  const ranking = params.ranking;
  const dimensions =
    params.dimensions?.length
      ? params.dimensions
      : (ranking?.dimension_scores ?? []).map((d) => ({
          key: d.key,
          label: d.label || DIMENSION_LABELS[d.key as keyof typeof DIMENSION_LABELS] || d.key,
          score: d.score,
          status: d.status,
          evidence: d.evidence,
        }));
  const qualityChecks = resolveQualityChecks({ ranking, dimensions });
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
    qualityChecks,
    qualityAverage: ranking?.quality_average ?? (qualityChecks ? qualityAverage(qualityChecks) : null),
    dimensions,
    recommendations: params.recommendations?.length
      ? params.recommendations
      : (ranking?.recommendations ?? []).map((r) => ({
          priority: r.priority,
          title: r.title,
          detail: r.detail,
        })),
    generatedAt: new Date().toISOString(),
    institutionName: params.institutionName?.trim() || "",
  };
}

export function studentReportFileName(candidateName: string): string {
  const slug = (candidateName || "student")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${slug || "student"}-cv-report.pdf`;
}
