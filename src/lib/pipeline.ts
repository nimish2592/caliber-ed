import { analyzeCv, DEFAULT_HIGHER_ED_PROFILE } from "./assessment";
import { normalizeCandidateEmail } from "./candidates/profile";
import {
  assertWithinLimit,
  completeAssessment,
  failAssessment,
  findOrCreateStudent,
  getGoalById,
  getInstitution,
  incrementUsage,
  insertQueuedAssessment,
  resolvePublicGoal,
  saveDocument,
  upsertCandidateFromCv,
  type GoalRow,
} from "./db/queries";
import { buildRanking } from "./ranking/mapRanking";
import { newId, saveCvFile, sha256Hex } from "./storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?)$/i;

export type StudentContactInput = {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CreateAssessmentInput = {
  file: File;
  goalSlug?: string | null;
  goalId?: string | null;
  institutionId?: string | null;
  uploadedByEmail?: string | null;
  contact?: StudentContactInput | null;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createAssessmentJob(input: CreateAssessmentInput): Promise<{
  id: string;
  token: string;
}> {
  if (!input.file?.size) throw new Error("Please choose a CV file to upload.");
  if (input.file.size > MAX_BYTES) throw new Error("Please upload a file smaller than 8 MB.");
  if (!ALLOWED.test(input.file.name)) throw new Error("Please upload a PDF or DOCX file.");

  const contact = normalizeContact(input.contact);
  // Public QR uploads must collect name + email so staff can email the share link later.
  if (input.goalSlug) {
    if (!contact.displayName) throw new Error("Please enter your full name.");
    if (!contact.email || !isValidEmail(contact.email)) {
      throw new Error("Please enter a valid email address.");
    }
  }

  const goal = await resolveGoal(input);
  await assertWithinLimit(goal.institution_id);

  const token = crypto.randomUUID().replace(/-/g, "");
  const assessmentId = await insertQueuedAssessment({
    institutionId: goal.institution_id,
    eventId: null,
    goalId: goal.id,
    accessToken: token,
  });

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const fileName = input.file.name;
  const mimeType = input.file.type || "application/octet-stream";

  try {
    await runAssessment({
      assessmentId,
      institutionId: goal.institution_id,
      fileName,
      mimeType,
      bytes,
      goal,
      uploadedByEmail: input.uploadedByEmail,
      contact,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assessment failed";
    await failAssessment(assessmentId, goal.institution_id, message);
  }

  return { id: assessmentId, token };
}

function normalizeContact(contact?: StudentContactInput | null): {
  displayName: string | null;
  email: string | null;
  phone: string | null;
} {
  const displayName = contact?.displayName?.trim() || null;
  const email = normalizeCandidateEmail(contact?.email) || null;
  const phone = contact?.phone?.trim() || null;
  return { displayName, email, phone };
}

async function resolveGoal(input: CreateAssessmentInput): Promise<GoalRow> {
  if (input.goalId && input.institutionId) {
    const goal = await getGoalById(input.goalId, input.institutionId);
    if (!goal) throw new Error("This goal was not found.");
    return goal;
  }
  if (input.goalSlug) {
    const goal = await resolvePublicGoal(input.goalSlug);
    if (!goal) throw new Error("This goal link is not valid.");
    return goal;
  }
  throw new Error("Choose a goal before uploading a CV.");
}

async function runAssessment(params: {
  assessmentId: string;
  institutionId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  goal: GoalRow;
  uploadedByEmail?: string | null;
  contact: { displayName: string | null; email: string | null; phone: string | null };
}): Promise<void> {
  const institution = await getInstitution(params.institutionId);
  if (!institution) throw new Error("Institution not found.");

  const { text, structured, result } = await analyzeCv({
    bytes: params.bytes,
    fileName: params.fileName,
    mimeType: params.mimeType,
    profile: DEFAULT_HIGHER_ED_PROFILE,
    goal: {
      title: params.goal.title,
      contextText: params.goal.context_text,
      focusSkills: params.goal.focus_skills,
    },
    engine: institution.assessment_engine,
    model: institution.assessment_model,
  });

  // Prefer form contact over CV-parsed identity (QR collects these explicitly).
  if (params.contact.displayName) structured.name = params.contact.displayName;
  if (params.contact.email) structured.email = params.contact.email;
  if (params.contact.phone) structured.phone = params.contact.phone;

  const ranking = buildRanking({
    structured,
    result,
    text,
    fileName: params.fileName,
    focusSkills: params.goal.focus_skills,
    goalTitle: params.goal.title,
    goalContext: params.goal.context_text,
  });

  const studentId = await findOrCreateStudent({
    institutionId: params.institutionId,
    email: structured.email,
    displayName: structured.name || ranking.candidate_name || "Student",
  });

  const documentId = newId("doc");
  const contentHash = await sha256Hex(params.bytes);
  const storagePath = await saveCvFile({
    institutionSlug: institution.slug,
    owner: params.uploadedByEmail
      ? { kind: "login", key: params.uploadedByEmail }
      : { kind: "goal", key: params.goal.public_slug },
    assessmentId: params.assessmentId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    bytes: params.bytes,
  });

  await saveDocument({
    id: documentId,
    institutionId: params.institutionId,
    studentId,
    originalName: params.fileName,
    mimeType: params.mimeType,
    storagePath,
    byteSize: params.bytes.byteLength,
    contentHash,
  });

  const candidateId = await upsertCandidateFromCv({
    institutionId: params.institutionId,
    studentId,
    structured,
    ranking,
    goalTitle: params.goal.title,
    fileName: params.fileName,
    documentId,
    contentHash,
  });

  await completeAssessment({
    assessmentId: params.assessmentId,
    institutionId: params.institutionId,
    studentId,
    documentId,
    candidateId,
    result,
    structured,
    text,
    ranking,
  });

  await incrementUsage(params.institutionId);
}
