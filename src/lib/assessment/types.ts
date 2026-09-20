export const DIMENSION_KEYS = [
  "education",
  "skills",
  "experience",
  "internships",
  "projects",
  "achievements",
  "certifications",
  "formatting",
  "completeness",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type DimensionStatus = "strong" | "good" | "developing" | "needs_improvement";

export type RecommendationPriority = "high" | "medium" | "optional";

export type StructuredCv = {
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  otherLinks: string[];
  education: string[];
  experience: string[];
  internships: string[];
  skills: string[];
  projects: string[];
  achievements: string[];
  certifications: string[];
  extracurricular: string[];
  presentSections: DimensionKey[];
};

export type DimensionScore = {
  key: DimensionKey;
  label: string;
  weight: number;
  score: number;
  status: DimensionStatus;
  evidence: string;
};

export type Recommendation = {
  priority: RecommendationPriority;
  title: string;
  detail: string;
  dimension: DimensionKey;
};

export type AssessmentProfile = {
  name: string;
  slug: string;
  dimensions: Record<DimensionKey, number>;
};

export type GoalGradeSnapshot = {
  score: number;
  grade: string;
  matchedSkills: string[];
  missingSkills: string[];
  fit: {
    profile_quality: number;
    focus_skills: number;
    context_alignment: number;
    weights: { profile: number; skills: number; context: number };
  };
};

export type EngineResult = {
  overallScore: number;
  summary: string;
  dimensions: DimensionScore[];
  recommendations: Recommendation[];
  engine: string;
  profileScore?: number;
  llmGoalFit?: number;
  llmGoalEvidence?: string;
  goalGrade?: GoalGradeSnapshot;
};

export type AssessmentEngine = {
  name: string;
  score: (input: {
    text: string;
    structured: StructuredCv;
    profile: AssessmentProfile;
    goal?: GoalContext;
  }) => Promise<EngineResult>;
};

export type GoalContext = {
  title: string;
  contextText: string;
  focusSkills: string[];
};
