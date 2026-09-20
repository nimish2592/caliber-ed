import { dbOne, dbQuery } from "./client";
import { newId } from "../storage";
import type { EngineResult, StructuredCv } from "../assessment/types";
import type { GoalStatus, RankedCv, RankingPayload } from "../ranking/types";
import { letterGradeFromScore } from "../grading/letterGrade";
import type { CandidateDirectoryStatus, CandidateRow } from "../candidates/types";
import { DEFAULT_DIRECTORY_STATUS } from "../candidates/types";
import { mergeProfile, normalizeCandidateEmail, profileFromStructured } from "../candidates/profile";

export type InstitutionRow = {
  id: string;
  name: string;
  slug: string;
  kind: "platform" | "campus";
  logo_url: string | null;
  branding: Record<string, unknown>;
  student_instructions: string;
  retention_days: number;
  show_student_identities: boolean;
};

export type EventRow = {
  id: string;
  institution_id: string;
  name: string;
  public_slug: string;
  public_code: string;
  instructions: string;
};

export type AssessmentRow = {
  id: string;
  institution_id: string;
  student_id: string | null;
  event_id: string | null;
  goal_id: string | null;
  document_id: string | null;
  access_token: string;
  status: string;
  overall_score: number | null;
  summary: string;
  engine: string;
  error: string | null;
  candidate_name: string;
  ranking: RankingPayload | null;
  created_at: string;
  completed_at: string | null;
};

export type GoalRow = {
  id: string;
  institution_id: string;
  goal_code: string;
  title: string;
  context_text: string;
  focus_skills: string[];
  status: GoalStatus;
  public_slug: string;
  public_code: string;
  created_by: string;
  created_at: string;
  context_file_name: string | null;
  context_mime_type: string | null;
  context_storage_path: string | null;
  cv_count?: number;
};

export type StoredFileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  storage_path: string;
};

export type CvShareRow = {
  id: string;
  institution_id: string;
  assessment_id: string;
  share_token: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asRanking(value: unknown): RankingPayload | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as RankingPayload) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as RankingPayload;
  return null;
}

function asStructured(value: unknown): StructuredCv | null {
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === "object" ? (parsed as StructuredCv) : null;
      } catch {
        return null;
      }
    }
    return null;
  }
  return value as StructuredCv;
}

const GOAL_FIELDS = `id, institution_id, goal_code, title, context_text, focus_skills, status,
  public_slug, public_code, created_by, created_at::text,
  context_file_name, context_mime_type, context_storage_path`;

const GOAL_FIELDS_ALIASED = `g.id, g.institution_id, g.goal_code, g.title, g.context_text, g.focus_skills, g.status,
  g.public_slug, g.public_code, g.created_by, g.created_at::text,
  g.context_file_name, g.context_mime_type, g.context_storage_path`;

function mapGoal(row: Omit<GoalRow, "focus_skills"> & { focus_skills: unknown }): GoalRow {
  return {
    ...row,
    focus_skills: asStringArray(row.focus_skills),
    context_file_name: row.context_file_name ?? null,
    context_mime_type: row.context_mime_type ?? null,
    context_storage_path: row.context_storage_path ?? null,
  };
}

export type SubscriptionRow = {
  institution_id: string;
  plan: string;
  annual_limit: number;
  assessments_used: number;
  period_start: string;
  renewal_date: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function getInstitution(id: string): Promise<InstitutionRow | null> {
  return dbOne<InstitutionRow>(
    `SELECT id, name, slug, kind, logo_url, branding, student_instructions, retention_days, show_student_identities
     FROM institutions WHERE id = $1`,
    [id],
  );
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  return dbOne<EventRow>(
    `SELECT id, institution_id, name, public_slug, public_code, instructions
     FROM events WHERE public_slug = $1`,
    [slug],
  );
}

export async function getEventById(id: string, institutionId: string): Promise<EventRow | null> {
  return dbOne<EventRow>(
    `SELECT id, institution_id, name, public_slug, public_code, instructions
     FROM events WHERE id = $1 AND institution_id = $2`,
    [id, institutionId],
  );
}

export async function listEvents(institutionId: string): Promise<EventRow[]> {
  return dbQuery<EventRow>(
    `SELECT id, institution_id, name, public_slug, public_code, instructions
     FROM events WHERE institution_id = $1 ORDER BY created_at DESC`,
    [institutionId],
  );
}

export async function createEvent(params: {
  institutionId: string;
  name: string;
  instructions?: string;
}): Promise<EventRow> {
  const id = newId("evt");
  const base = slugify(params.name) || "event";
  const suffix = id.slice(-4);
  const publicSlug = `${base}-${suffix}`;
  const publicCode = `EVT-${suffix.toUpperCase()}`;
  await dbQuery(
    `INSERT INTO events (id, institution_id, name, public_slug, public_code, instructions)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, params.institutionId, params.name.trim(), publicSlug, publicCode, params.instructions ?? ""],
  );
  const row = await getEventById(id, params.institutionId);
  if (!row) throw new Error("Failed to create event");
  return row;
}

export async function getSubscription(institutionId: string): Promise<SubscriptionRow | null> {
  return dbOne<SubscriptionRow>(
    `SELECT institution_id, plan, annual_limit, assessments_used, period_start::text, renewal_date::text
     FROM subscriptions WHERE institution_id = $1`,
    [institutionId],
  );
}

export async function assertWithinLimit(institutionId: string): Promise<SubscriptionRow> {
  const sub = await getSubscription(institutionId);
  if (!sub) throw new Error("No subscription found for this institution");
  if (sub.assessments_used >= sub.annual_limit) {
    throw new Error("This institution has reached its annual assessment limit.");
  }
  return sub;
}

export async function incrementUsage(institutionId: string): Promise<void> {
  await dbQuery(
    `UPDATE subscriptions SET assessments_used = assessments_used + 1 WHERE institution_id = $1`,
    [institutionId],
  );
  await dbQuery(
    `UPDATE usage SET assessments_used = assessments_used + 1
     WHERE institution_id = $1 AND period_start = (
       SELECT period_start FROM subscriptions WHERE institution_id = $1
     )`,
    [institutionId],
  );
}

export async function findOrCreateStudent(params: {
  institutionId: string;
  email: string | null;
  displayName: string;
}): Promise<string> {
  if (params.email) {
    const existing = await dbOne<{ id: string }>(
      `SELECT id FROM students WHERE institution_id = $1 AND lower(email) = lower($2)`,
      [params.institutionId, params.email],
    );
    if (existing) return existing.id;
  }
  const id = newId("stu");
  await dbQuery(
    `INSERT INTO students (id, institution_id, email, display_name) VALUES ($1, $2, $3, $4)`,
    [id, params.institutionId, params.email, params.displayName],
  );
  return id;
}

export async function insertQueuedAssessment(params: {
  institutionId: string;
  eventId: string | null;
  goalId: string | null;
  accessToken: string;
}): Promise<string> {
  const id = newId("asm");
  await dbQuery(
    `INSERT INTO assessments (id, institution_id, event_id, goal_id, access_token, status)
     VALUES ($1, $2, $3, $4, $5, 'queued')`,
    [id, params.institutionId, params.eventId, params.goalId, params.accessToken],
  );
  return id;
}

export async function saveDocument(params: {
  id: string;
  institutionId: string;
  studentId: string | null;
  originalName: string;
  mimeType: string;
  storagePath: string;
  byteSize: number;
  contentHash: string;
}): Promise<void> {
  await dbQuery(
    `INSERT INTO cv_documents
      (id, institution_id, student_id, original_name, mime_type, storage_path, byte_size, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.id,
      params.institutionId,
      params.studentId,
      params.originalName,
      params.mimeType,
      params.storagePath,
      params.byteSize,
      params.contentHash,
    ],
  );
}

export async function completeAssessment(params: {
  assessmentId: string;
  institutionId: string;
  studentId: string;
  documentId: string;
  candidateId: string | null;
  result: EngineResult;
  structured: StructuredCv;
  text: string;
  ranking: RankingPayload;
}): Promise<void> {
  await dbQuery(
    `UPDATE assessments
     SET student_id = $2, document_id = $3, status = 'completed', overall_score = $4,
         summary = $5, engine = $6, completed_at = now(), error = NULL,
         candidate_name = $8, ranking = $9::jsonb, candidate_id = $10
     WHERE id = $1 AND institution_id = $7`,
    [
      params.assessmentId,
      params.studentId,
      params.documentId,
      params.result.overallScore,
      params.result.summary,
      params.result.engine,
      params.institutionId,
      params.ranking.candidate_name,
      JSON.stringify(params.ranking),
      params.candidateId,
    ],
  );

  await dbQuery(
    `INSERT INTO cv_analysis (id, institution_id, assessment_id, extracted_text, structured)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [newId("anl"), params.institutionId, params.assessmentId, params.text, JSON.stringify(params.structured)],
  );

  for (const dim of params.result.dimensions) {
    await dbQuery(
      `INSERT INTO assessment_dimensions
        (id, institution_id, assessment_id, dimension, score, status, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId("dim"), params.institutionId, params.assessmentId, dim.key, dim.score, dim.status, dim.evidence],
    );
  }

  for (const [index, rec] of params.result.recommendations.entries()) {
    await dbQuery(
      `INSERT INTO recommendations
        (id, institution_id, assessment_id, priority, title, detail, dimension, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId("rec"),
        params.institutionId,
        params.assessmentId,
        rec.priority,
        rec.title,
        rec.detail,
        rec.dimension,
        index,
      ],
    );
  }
}

export async function failAssessment(assessmentId: string, institutionId: string, error: string): Promise<void> {
  await dbQuery(
    `UPDATE assessments SET status = 'failed', error = $3 WHERE id = $1 AND institution_id = $2`,
    [assessmentId, institutionId, error.slice(0, 500)],
  );
}

const ASSESSMENT_SELECT = `id, institution_id, student_id, event_id, goal_id, document_id, access_token, status,
            overall_score, summary, engine, error, candidate_name, ranking,
            created_at::text, completed_at::text`;

export async function getAssessmentForAccess(id: string, token: string): Promise<AssessmentRow | null> {
  const row = await dbOne<AssessmentRow>(
    `SELECT ${ASSESSMENT_SELECT} FROM assessments WHERE id = $1 AND access_token = $2`,
    [id, token],
  );
  if (!row) return null;
  return { ...row, ranking: asRanking(row.ranking) };
}

export async function getAssessmentForInstitution(id: string, institutionId: string): Promise<AssessmentRow | null> {
  const row = await dbOne<AssessmentRow>(
    `SELECT ${ASSESSMENT_SELECT} FROM assessments WHERE id = $1 AND institution_id = $2`,
    [id, institutionId],
  );
  if (!row) return null;
  return { ...row, ranking: asRanking(row.ranking) };
}

export type DimensionRow = { dimension: string; score: number; status: string; evidence: string };
export type RecRow = { priority: string; title: string; detail: string; dimension: string | null; sort_order: number };

export async function getAssessmentDetails(assessmentId: string, institutionId: string) {
  const dimensions = await dbQuery<DimensionRow>(
    `SELECT dimension, score, status, evidence FROM assessment_dimensions
     WHERE assessment_id = $1 AND institution_id = $2 ORDER BY dimension`,
    [assessmentId, institutionId],
  );
  const recommendations = await dbQuery<RecRow>(
    `SELECT priority, title, detail, dimension, sort_order FROM recommendations
     WHERE assessment_id = $1 AND institution_id = $2 ORDER BY sort_order`,
    [assessmentId, institutionId],
  );
  return { dimensions, recommendations };
}

export async function updateInstitutionSettings(params: {
  institutionId: string;
  name: string;
  studentInstructions: string;
  retentionDays: number;
  showStudentIdentities: boolean;
}): Promise<void> {
  await dbQuery(
    `UPDATE institutions
     SET name = $2, student_instructions = $3, retention_days = $4, show_student_identities = $5
     WHERE id = $1`,
    [
      params.institutionId,
      params.name.trim(),
      params.studentInstructions,
      params.retentionDays,
      params.showStudentIdentities,
    ],
  );
}

export type DashboardStats = {
  assessed: number;
  averageScore: number | null;
  needingImprovement: number;
  distribution: { bucket: string; count: number }[];
  weaknesses: { dimension: string; pct: number }[];
};

export async function getDashboardStats(institutionId: string, eventId?: string): Promise<DashboardStats> {
  const eventClause = eventId ? "AND event_id = $2" : "";
  const params = eventId ? [institutionId, eventId] : [institutionId];

  const totals = await dbOne<{ assessed: string; avg: string | null; needing: string }>(
    `SELECT
       COUNT(*)::text AS assessed,
       ROUND(AVG(overall_score))::text AS avg,
       COUNT(*) FILTER (WHERE overall_score < 65)::text AS needing
     FROM assessments
     WHERE institution_id = $1 AND status = 'completed' ${eventClause}`,
    params,
  );

  const distribution = await dbQuery<{ bucket: string; count: string }>(
    `SELECT bucket, COUNT(*)::text AS count FROM (
       SELECT CASE
         WHEN overall_score >= 90 THEN '90–100'
         WHEN overall_score >= 80 THEN '80–89'
         WHEN overall_score >= 70 THEN '70–79'
         WHEN overall_score >= 60 THEN '60–69'
         ELSE 'Below 60'
       END AS bucket
       FROM assessments
       WHERE institution_id = $1 AND status = 'completed' AND overall_score IS NOT NULL ${eventClause}
     ) t GROUP BY bucket`,
    params,
  );

  const weak = await dbQuery<{ dimension: string; pct: string }>(
    `SELECT dimension,
            ROUND(100.0 * COUNT(*) FILTER (WHERE score < 65) / NULLIF(COUNT(*), 0))::text AS pct
     FROM assessment_dimensions d
     JOIN assessments a ON a.id = d.assessment_id
     WHERE a.institution_id = $1 AND a.status = 'completed' ${eventClause}
     GROUP BY dimension
     ORDER BY pct DESC NULLS LAST`,
    params,
  );

  const order = ["90–100", "80–89", "70–79", "60–69", "Below 60"];
  const distMap = new Map(distribution.map((d) => [d.bucket, Number(d.count)]));

  return {
    assessed: Number(totals?.assessed ?? 0),
    averageScore: totals?.avg == null ? null : Number(totals.avg),
    needingImprovement: Number(totals?.needing ?? 0),
    distribution: order.map((bucket) => ({ bucket, count: distMap.get(bucket) ?? 0 })),
    weaknesses: weak
      .map((w) => ({ dimension: w.dimension, pct: Number(w.pct ?? 0) }))
      .filter((w) => w.pct > 0)
      .slice(0, 6),
  };
}

export async function getGoalBySlug(slug: string): Promise<GoalRow | null> {
  const row = await dbOne<Omit<GoalRow, "focus_skills"> & { focus_skills: unknown }>(
    `SELECT ${GOAL_FIELDS} FROM goals WHERE public_slug = $1`,
    [slug],
  );
  return row ? mapGoal(row) : null;
}

export async function resolvePublicGoal(slug: string): Promise<GoalRow | null> {
  const direct = await getGoalBySlug(slug);
  if (direct) return direct;
  const event = await getEventBySlug(slug);
  if (!event) return null;
  const goals = await listGoals(event.institution_id);
  return goals.find((g) => g.status === "active") ?? goals[0] ?? null;
}

export async function getGoalById(id: string, institutionId: string): Promise<GoalRow | null> {
  const row = await dbOne<Omit<GoalRow, "focus_skills"> & { focus_skills: unknown; cv_count: string }>(
    `SELECT ${GOAL_FIELDS_ALIASED}, COUNT(a.id)::text AS cv_count
     FROM goals g
     LEFT JOIN assessments a ON a.goal_id = g.id
     WHERE g.id = $1 AND g.institution_id = $2
     GROUP BY g.id`,
    [id, institutionId],
  );
  if (!row) return null;
  return { ...mapGoal(row), cv_count: Number(row.cv_count ?? 0) };
}

export async function listGoals(institutionId: string): Promise<GoalRow[]> {
  const rows = await dbQuery<Omit<GoalRow, "focus_skills"> & { focus_skills: unknown; cv_count: string }>(
    `SELECT ${GOAL_FIELDS_ALIASED}, COUNT(a.id)::text AS cv_count
     FROM goals g
     LEFT JOIN assessments a ON a.goal_id = g.id
     WHERE g.institution_id = $1
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [institutionId],
  );
  return rows.map((row) => ({ ...mapGoal(row), cv_count: Number(row.cv_count ?? 0) }));
}

export async function createGoal(params: {
  id?: string;
  institutionId: string;
  title: string;
  contextText: string;
  focusSkills: string[];
  createdBy: string;
  contextFile?: {
    fileName: string;
    mimeType: string;
    storagePath: string;
  } | null;
}): Promise<GoalRow> {
  const id = params.id ?? newId("goal");
  const countRow = await dbOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM goals WHERE institution_id = $1`,
    [params.institutionId],
  );
  const next = Number(countRow?.n ?? 0) + 1;
  const goalCode = `GL-${String(next).padStart(3, "0")}`;
  const base = slugify(params.title) || "goal";
  const suffix = id.slice(-4);
  const publicSlug = `${base}-${suffix}`;

  await dbQuery(
    `INSERT INTO goals (id, institution_id, goal_code, title, context_text, focus_skills, status, public_slug, public_code, created_by,
                        context_file_name, context_mime_type, context_storage_path)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'active', $7, $8, $9, $10, $11, $12)`,
    [
      id,
      params.institutionId,
      goalCode,
      params.title.trim(),
      params.contextText,
      JSON.stringify(params.focusSkills),
      publicSlug,
      goalCode,
      params.createdBy,
      params.contextFile?.fileName ?? null,
      params.contextFile?.mimeType ?? null,
      params.contextFile?.storagePath ?? null,
    ],
  );
  const row = await getGoalById(id, params.institutionId);
  if (!row) throw new Error("Failed to create goal");
  return row;
}

export async function updateGoalStatus(id: string, institutionId: string, status: GoalStatus): Promise<void> {
  await dbQuery(`UPDATE goals SET status = $3 WHERE id = $1 AND institution_id = $2`, [
    id,
    institutionId,
    status,
  ]);
}

export async function updateGoalContextFile(
  id: string,
  institutionId: string,
  file: { fileName: string; mimeType: string; storagePath: string } | null,
): Promise<void> {
  await dbQuery(
    `UPDATE goals
     SET context_file_name = $3, context_mime_type = $4, context_storage_path = $5
     WHERE id = $1 AND institution_id = $2`,
    [id, institutionId, file?.fileName ?? null, file?.mimeType ?? null, file?.storagePath ?? null],
  );
}

export async function getDocumentForAssessment(
  assessmentId: string,
  institutionId: string,
): Promise<StoredFileRow | null> {
  return dbOne<StoredFileRow>(
    `SELECT d.id, d.original_name, d.mime_type, d.storage_path
     FROM assessments a
     JOIN cv_documents d ON d.id = a.document_id
     WHERE a.id = $1 AND a.institution_id = $2`,
    [assessmentId, institutionId],
  );
}

export async function getDocumentForCandidate(
  candidateId: string,
  institutionId: string,
): Promise<StoredFileRow | null> {
  const fromCandidate = await dbOne<StoredFileRow>(
    `SELECT d.id, d.original_name, d.mime_type, d.storage_path
     FROM candidates c
     JOIN cv_documents d ON d.id = c.document_id
     WHERE c.id = $1 AND c.institution_id = $2`,
    [candidateId, institutionId],
  );
  if (fromCandidate) return fromCandidate;
  return dbOne<StoredFileRow>(
    `SELECT d.id, d.original_name, d.mime_type, d.storage_path
     FROM assessments a
     JOIN cv_documents d ON d.id = a.document_id
     WHERE a.candidate_id = $1 AND a.institution_id = $2
     ORDER BY a.completed_at DESC NULLS LAST, a.created_at DESC
     LIMIT 1`,
    [candidateId, institutionId],
  );
}

function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getOrCreateCvShare(params: {
  institutionId: string;
  assessmentId: string;
  createdBy: string;
}): Promise<CvShareRow> {
  const existing = await dbOne<CvShareRow>(
    `SELECT id, institution_id, assessment_id, share_token, is_active, created_by, created_at::text
     FROM cv_shares
     WHERE assessment_id = $1 AND institution_id = $2 AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.assessmentId, params.institutionId],
  );
  if (existing) return existing;

  const id = newId("share");
  const shareToken = generateShareToken();
  await dbQuery(
    `INSERT INTO cv_shares (id, institution_id, assessment_id, share_token, is_active, created_by)
     VALUES ($1, $2, $3, $4, true, $5)`,
    [id, params.institutionId, params.assessmentId, shareToken, params.createdBy],
  );
  const row = await dbOne<CvShareRow>(
    `SELECT id, institution_id, assessment_id, share_token, is_active, created_by, created_at::text
     FROM cv_shares WHERE id = $1`,
    [id],
  );
  if (!row) throw new Error("Failed to create share link.");
  return row;
}

export type PublicCvShare = {
  share: CvShareRow;
  assessment: AssessmentRow;
  goalTitle: string;
  goalCode: string;
  document: StoredFileRow | null;
};

export async function getPublicCvShare(token: string): Promise<PublicCvShare | null> {
  const row = await dbOne<
    CvShareRow & {
      ranking: unknown;
      candidate_name: string;
      document_id: string | null;
      status: string;
      summary: string;
      overall_score: number | null;
      created_at_assessment: string;
      completed_at: string | null;
      engine: string;
      error: string | null;
      student_id: string | null;
      event_id: string | null;
      goal_id: string | null;
      access_token: string;
      goal_title: string | null;
      goal_code: string | null;
      original_name: string | null;
      mime_type: string | null;
      storage_path: string | null;
      document_row_id: string | null;
    }
  >(
    `SELECT s.id, s.institution_id, s.assessment_id, s.share_token, s.is_active, s.created_by, s.created_at::text,
            a.ranking, a.candidate_name, a.document_id, a.status, a.summary, a.overall_score,
            a.created_at::text AS created_at_assessment, a.completed_at::text, a.engine, a.error,
            a.student_id, a.event_id, a.goal_id, a.access_token,
            g.title AS goal_title, g.goal_code,
            d.id AS document_row_id, d.original_name, d.mime_type, d.storage_path
     FROM cv_shares s
     JOIN assessments a ON a.id = s.assessment_id
     LEFT JOIN goals g ON g.id = a.goal_id
     LEFT JOIN cv_documents d ON d.id = a.document_id
     WHERE s.share_token = $1 AND s.is_active = true`,
    [token],
  );
  if (!row) return null;

  await dbQuery(`UPDATE cv_shares SET last_viewed_at = now() WHERE id = $1`, [row.id]);

  return {
    share: {
      id: row.id,
      institution_id: row.institution_id,
      assessment_id: row.assessment_id,
      share_token: row.share_token,
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
    },
    assessment: {
      id: row.assessment_id,
      institution_id: row.institution_id,
      student_id: row.student_id,
      event_id: row.event_id,
      goal_id: row.goal_id,
      document_id: row.document_id,
      access_token: row.access_token,
      status: row.status,
      overall_score: row.overall_score,
      summary: row.summary,
      engine: row.engine,
      error: row.error,
      candidate_name: row.candidate_name,
      ranking: asRanking(row.ranking),
      created_at: row.created_at_assessment,
      completed_at: row.completed_at,
    },
    goalTitle: row.goal_title || "Goal",
    goalCode: row.goal_code || "",
    document: row.document_row_id
      ? {
          id: row.document_row_id,
          original_name: row.original_name || "CV",
          mime_type: row.mime_type || "application/octet-stream",
          storage_path: row.storage_path || "",
        }
      : null,
  };
}

export async function listRankedCvs(goalId: string, institutionId: string): Promise<RankedCv[]> {
  const rows = await dbQuery<{
    id: string;
    status: string;
    candidate_name: string;
    ranking: unknown;
    created_at: string;
    completed_at: string | null;
    file_name: string | null;
    student_email: string | null;
    overall_score: number | null;
    summary: string;
  }>(
    `SELECT a.id, a.status, a.candidate_name, a.ranking, a.created_at::text, a.completed_at::text,
            a.overall_score, a.summary, d.original_name AS file_name, s.email AS student_email
     FROM assessments a
     LEFT JOIN cv_documents d ON d.id = a.document_id
     LEFT JOIN students s ON s.id = a.student_id
     WHERE a.goal_id = $1 AND a.institution_id = $2
     ORDER BY a.overall_score DESC NULLS LAST, a.created_at DESC`,
    [goalId, institutionId],
  );

  return rows.map((row) => {
    const ranking = asRanking(row.ranking);
    const fallback: RankingPayload = {
      candidate_name: row.candidate_name || "Unknown",
      file_name: row.file_name || "CV",
      score: row.overall_score ?? 0,
      grade: letterGradeFromScore(row.overall_score ?? 0),
      scores: {
        skills_score: 0,
        experience_score: 0,
        years_score: 0,
        education_score: 0,
        achievements_score: 0,
        keyword_score: 0,
        location_score: 0,
      },
      matched_skills: [],
      missing_skills: [],
      highlights: [],
      red_flags: [],
      experience_match: "low",
      recommendation: "needs_work",
      reason: row.summary || "",
      mandatory_match_pct: 0,
      critical_skills_missing: [],
      experience_fit_status: "unknown",
      overqualification_penalty: 0,
      years_experience: 0,
      candidate_location: null,
      location_match_status: null,
      resume_text: "",
      candidate_email: row.student_email,
    };
    const payload = ranking ?? fallback;
    return {
      ...payload,
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      ranked_at: row.completed_at,
      file_name: payload.file_name || row.file_name || "CV",
      candidate_name: payload.candidate_name || row.candidate_name || "Unknown",
      candidate_email: payload.candidate_email || row.student_email,
      score: row.status === "completed" ? (payload.score ?? row.overall_score ?? 0) : payload.score,
      grade: payload.grade || letterGradeFromScore(payload.score ?? row.overall_score ?? 0),
    };
  });
}

function mapCandidate(row: Record<string, unknown>): CandidateRow {
  return {
    id: String(row.id),
    institution_id: String(row.institution_id),
    candidate_code: String(row.candidate_code),
    display_name: String(row.display_name ?? ""),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    github_url: (row.github_url as string | null) ?? null,
    degree: (row.degree as string | null) ?? null,
    college: (row.college as string | null) ?? null,
    profile_summary: (row.profile_summary as string | null) ?? null,
    skills: asStringArray(row.skills),
    companies: asStringArray(row.companies),
    goals: asStringArray(row.goals),
    years_experience: Number(row.years_experience ?? 0),
    cv_file_name: (row.cv_file_name as string | null) ?? null,
    document_id: (row.document_id as string | null) ?? null,
    content_hash: (row.content_hash as string | null) ?? null,
    last_score: row.last_score == null ? null : Number(row.last_score),
    last_recommendation: (row.last_recommendation as string | null) ?? null,
    last_ranked_at: (row.last_ranked_at as string | null) ?? null,
    directory_status: (row.directory_status as CandidateDirectoryStatus) || DEFAULT_DIRECTORY_STATUS,
    archived: Boolean(row.archived),
    student_id: (row.student_id as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    goal_count: asStringArray(row.goals).length,
  };
}

const CANDIDATE_SELECT = `id, institution_id, candidate_code, display_name, email, phone, linkedin_url, github_url,
  degree, college, profile_summary, skills, companies, goals, years_experience, cv_file_name, document_id,
  content_hash, last_score, last_recommendation, last_ranked_at::text, directory_status, archived, student_id,
  created_at::text, updated_at::text`;

async function generateCandidateCode(institutionId: string): Promise<string> {
  const rows = await dbQuery<{ candidate_code: string }>(
    `SELECT candidate_code FROM candidates WHERE institution_id = $1`,
    [institutionId],
  );
  const nums = rows
    .map((r) => {
      const m = r.candidate_code.match(/^Cd-(\d+)$/i);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `Cd-${String(next).padStart(6, "0")}`;
}

async function findCandidateByEmail(institutionId: string, email: string): Promise<CandidateRow | null> {
  const row = await dbOne<Record<string, unknown>>(
    `SELECT ${CANDIDATE_SELECT} FROM candidates WHERE institution_id = $1 AND lower(email) = lower($2) LIMIT 1`,
    [institutionId, email],
  );
  return row ? mapCandidate(row) : null;
}

async function findCandidateByHash(institutionId: string, hash: string): Promise<CandidateRow | null> {
  const row = await dbOne<Record<string, unknown>>(
    `SELECT ${CANDIDATE_SELECT} FROM candidates WHERE institution_id = $1 AND content_hash = $2 LIMIT 1`,
    [institutionId, hash],
  );
  return row ? mapCandidate(row) : null;
}

async function saveCandidateRow(row: CandidateRow): Promise<void> {
  await dbQuery(
    `UPDATE candidates SET
       display_name = $2, email = $3, phone = $4, linkedin_url = $5, github_url = $6,
       degree = $7, college = $8, profile_summary = $9, skills = $10::jsonb, companies = $11::jsonb,
       goals = $12::jsonb, years_experience = $13, cv_file_name = $14, document_id = $15,
       content_hash = $16, last_score = $17, last_recommendation = $18, last_ranked_at = $19::timestamptz,
       student_id = $20, updated_at = now()
     WHERE id = $1`,
    [
      row.id,
      row.display_name,
      row.email,
      row.phone,
      row.linkedin_url,
      row.github_url,
      row.degree,
      row.college,
      row.profile_summary,
      JSON.stringify(row.skills),
      JSON.stringify(row.companies),
      JSON.stringify(row.goals),
      row.years_experience,
      row.cv_file_name,
      row.document_id,
      row.content_hash,
      row.last_score,
      row.last_recommendation,
      row.last_ranked_at,
      row.student_id || null,
    ],
  );
}

export async function upsertCandidateFromCv(params: {
  institutionId: string;
  studentId: string;
  structured: StructuredCv;
  ranking: RankingPayload;
  goalTitle: string;
  fileName: string;
  documentId: string;
  contentHash: string;
}): Promise<string> {
  const incoming = profileFromStructured(params.structured);
  if (incoming.displayName === "Unknown" && params.ranking.candidate_name) {
    incoming.displayName = params.ranking.candidate_name;
  }
  if (!incoming.email && params.ranking.candidate_email) {
    incoming.email = normalizeCandidateEmail(params.ranking.candidate_email);
  }

  let existing: CandidateRow | null = null;
  if (incoming.email) existing = await findCandidateByEmail(params.institutionId, incoming.email);
  if (!existing && params.contentHash) {
    existing = await findCandidateByHash(params.institutionId, params.contentHash);
  }

  const lastRanked = new Date().toISOString();
  if (existing) {
    const merged = mergeProfile(existing, { ...incoming, goalTitle: params.goalTitle });
    await saveCandidateRow({
      ...merged,
      cv_file_name: params.fileName,
      document_id: params.documentId || existing.document_id,
      content_hash: existing.content_hash || params.contentHash || null,
      last_score: params.ranking.score,
      last_recommendation: params.ranking.recommendation,
      last_ranked_at: lastRanked,
      student_id: params.studentId,
    });
    return existing.id;
  }

  const id = newId("cand");
  const candidateCode = await generateCandidateCode(params.institutionId);
  await dbQuery(
    `INSERT INTO candidates (
       id, institution_id, candidate_code, display_name, email, phone, linkedin_url, github_url,
       degree, college, profile_summary, skills, companies, goals, years_experience, cv_file_name,
       document_id, content_hash, last_score, last_recommendation, last_ranked_at, directory_status,
       archived, student_id
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16,
       $17, $18, $19, $20, $21::timestamptz, $22, false, $23
     )`,
    [
      id,
      params.institutionId,
      candidateCode,
      incoming.displayName,
      incoming.email,
      incoming.phone,
      incoming.linkedinUrl,
      incoming.githubUrl,
      incoming.degree,
      incoming.college,
      incoming.profileSummary,
      JSON.stringify(incoming.skills),
      JSON.stringify(incoming.companies),
      JSON.stringify(params.goalTitle ? [params.goalTitle] : []),
      incoming.yearsExperience,
      params.fileName,
      params.documentId || null,
      params.contentHash || null,
      params.ranking.score,
      params.ranking.recommendation,
      lastRanked,
      DEFAULT_DIRECTORY_STATUS,
      params.studentId || null,
    ],
  );
  return id;
}

export async function backfillCandidates(institutionId: string): Promise<void> {
  const rows = await dbQuery<{
    id: string;
    student_id: string | null;
    document_id: string | null;
    ranking: unknown;
    structured: unknown;
    content_hash: string | null;
    original_name: string | null;
    goal_title: string | null;
  }>(
    `SELECT a.id, a.student_id, a.document_id, a.ranking, an.structured,
            d.content_hash, d.original_name, g.title AS goal_title
     FROM assessments a
     LEFT JOIN cv_analysis an ON an.assessment_id = a.id
     LEFT JOIN cv_documents d ON d.id = a.document_id
     LEFT JOIN goals g ON g.id = a.goal_id
     WHERE a.institution_id = $1 AND a.status = 'completed' AND a.candidate_id IS NULL`,
    [institutionId],
  );

  for (const row of rows) {
    const structured = asStructured(row.structured);
    const ranking = asRanking(row.ranking);
    if (!ranking) continue;
    const cv: StructuredCv = structured ?? {
      name: ranking.candidate_name,
      email: ranking.candidate_email,
      phone: null,
      summary: ranking.reason,
      linkedinUrl: null,
      githubUrl: null,
      otherLinks: [],
      education: [],
      experience: [],
      internships: [],
      skills: ranking.matched_skills,
      projects: [],
      achievements: [],
      certifications: [],
      extracurricular: [],
      presentSections: [],
    };
    try {
      const candidateId = await upsertCandidateFromCv({
        institutionId,
        studentId: row.student_id || "",
        structured: cv,
        ranking,
        goalTitle: row.goal_title || "",
        fileName: row.original_name || ranking.file_name,
        documentId: row.document_id || "",
        contentHash: row.content_hash || "",
      });
      await dbQuery(
        `UPDATE assessments SET candidate_id = $2 WHERE id = $1 AND institution_id = $3`,
        [row.id, candidateId, institutionId],
      );
    } catch {
      /* keep listing even if one row cannot be backfilled */
    }
  }
}

export async function listCandidates(params: {
  institutionId: string;
  archived?: boolean;
  search?: string;
}): Promise<{ rows: CandidateRow[]; active: number; archived: number }> {
  await backfillCandidates(params.institutionId);

  const archived = params.archived ?? false;
  const search = params.search?.trim() ?? "";
  const like = `%${search.replace(/%/g, "")}%`;

  const counts = await dbOne<{ active: string; archived: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE archived = false)::text AS active,
       COUNT(*) FILTER (WHERE archived = true)::text AS archived
     FROM candidates WHERE institution_id = $1`,
    [params.institutionId],
  );

  const searchClause = search
    ? `AND (
         display_name ILIKE $3 OR coalesce(email, '') ILIKE $3 OR coalesce(college, '') ILIKE $3
         OR coalesce(degree, '') ILIKE $3 OR candidate_code ILIKE $3
         OR skills::text ILIKE $3 OR goals::text ILIKE $3
       )`
    : "";
  const queryParams = search ? [params.institutionId, archived, like] : [params.institutionId, archived];

  const rows = await dbQuery<Record<string, unknown>>(
    `SELECT ${CANDIDATE_SELECT}
     FROM candidates
     WHERE institution_id = $1 AND archived = $2 ${searchClause}
     ORDER BY last_ranked_at DESC NULLS LAST, created_at DESC`,
    queryParams,
  );

  return {
    rows: rows.map(mapCandidate),
    active: Number(counts?.active ?? 0),
    archived: Number(counts?.archived ?? 0),
  };
}

export async function getCandidate(id: string, institutionId: string): Promise<CandidateRow | null> {
  const row = await dbOne<Record<string, unknown>>(
    `SELECT ${CANDIDATE_SELECT} FROM candidates WHERE id = $1 AND institution_id = $2`,
    [id, institutionId],
  );
  return row ? mapCandidate(row) : null;
}

export async function listCandidateRankings(candidateId: string, institutionId: string): Promise<RankedCv[]> {
  return listRankedCvsByCandidate(candidateId, institutionId);
}

async function listRankedCvsByCandidate(candidateId: string, institutionId: string): Promise<RankedCv[]> {
  const rows = await dbQuery<{
    id: string;
    status: string;
    candidate_name: string;
    ranking: unknown;
    created_at: string;
    completed_at: string | null;
    file_name: string | null;
    student_email: string | null;
    overall_score: number | null;
    summary: string;
  }>(
    `SELECT a.id, a.status, a.candidate_name, a.ranking, a.created_at::text, a.completed_at::text,
            a.overall_score, a.summary, d.original_name AS file_name, s.email AS student_email
     FROM assessments a
     LEFT JOIN cv_documents d ON d.id = a.document_id
     LEFT JOIN students s ON s.id = a.student_id
     WHERE a.candidate_id = $1 AND a.institution_id = $2
     ORDER BY a.completed_at DESC NULLS LAST`,
    [candidateId, institutionId],
  );

  return rows.map((row) => {
    const ranking = asRanking(row.ranking);
    const payload = ranking ?? {
      candidate_name: row.candidate_name || "Unknown",
      file_name: row.file_name || "CV",
      score: row.overall_score ?? 0,
      grade: letterGradeFromScore(row.overall_score ?? 0),
      scores: {
        skills_score: 0,
        experience_score: 0,
        years_score: 0,
        education_score: 0,
        achievements_score: 0,
        keyword_score: 0,
        location_score: 0,
      },
      matched_skills: [],
      missing_skills: [],
      highlights: [],
      red_flags: [],
      experience_match: "low" as const,
      recommendation: "needs_work" as const,
      reason: row.summary || "",
      mandatory_match_pct: 0,
      critical_skills_missing: [],
      experience_fit_status: "unknown",
      overqualification_penalty: 0,
      years_experience: 0,
      candidate_location: null,
      location_match_status: null,
      resume_text: "",
      candidate_email: row.student_email,
    };
    return {
      ...payload,
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      ranked_at: row.completed_at,
      file_name: payload.file_name || row.file_name || "CV",
      candidate_name: payload.candidate_name || row.candidate_name || "Unknown",
      candidate_email: payload.candidate_email || row.student_email,
      score: row.status === "completed" ? (payload.score ?? row.overall_score ?? 0) : payload.score,
      grade: payload.grade || letterGradeFromScore(payload.score ?? row.overall_score ?? 0),
    };
  });
}

export async function updateCandidateMeta(params: {
  id: string;
  institutionId: string;
  archived?: boolean;
  directoryStatus?: CandidateDirectoryStatus;
}): Promise<void> {
  if (params.archived != null) {
    await dbQuery(
      `UPDATE candidates SET archived = $3, updated_at = now() WHERE id = $1 AND institution_id = $2`,
      [params.id, params.institutionId, params.archived],
    );
  }
  if (params.directoryStatus) {
    await dbQuery(
      `UPDATE candidates SET directory_status = $3, updated_at = now() WHERE id = $1 AND institution_id = $2`,
      [params.id, params.institutionId, params.directoryStatus],
    );
  }
}
