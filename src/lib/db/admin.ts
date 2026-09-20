import bcrypt from "bcryptjs";
import { estimatedOpenAiCostUsd } from "../assessment/aiCost";
import { PLAN_LIMITS, campusAssessmentDefaults, type PlanId } from "../config";
import { newId } from "../storage";
import { dbOne, dbQuery } from "./client";
import type { InstitutionRow } from "./queries";

export type ClientListRow = {
  id: string;
  name: string;
  slug: string;
  kind: "platform" | "campus";
  plan: string;
  annual_limit: number;
  assessments_used: number;
  cvs_analysed: number;
  remaining: number;
  ai_cost_usd: number;
  user_count: number;
  active: boolean;
  created_at: string;
};

export type PlatformUsageTotals = {
  clients: number;
  allocated: number;
  analysed: number;
  remaining: number;
  aiCostUsd: number;
};

export type ProvisionedUserRow = {
  id: string;
  institution_id: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  has_password: boolean;
  active: boolean;
  created_at: string;
};

const DEFAULT_INSTRUCTIONS =
  "Upload your CV to get a career-readiness assessment you can use for internships and placements.";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function asInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function generateTempPassword(): string {
  return `Caliber-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function isPlanId(value: string): value is PlanId {
  return value in PLAN_LIMITS;
}

function asMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapClient(row: {
  id: string;
  name: string;
  slug: string;
  kind: "platform" | "campus";
  plan: string | null;
  annual_limit: number | string | null;
  assessments_used: number | string | null;
  cvs_analysed: number | string | null;
  ai_cost_usd: number | string | null;
  user_count: number | string;
  active?: boolean | string | number | null;
  created_at: string;
}): ClientListRow {
  const annualLimit = asInt(row.annual_limit);
  const used = asInt(row.assessments_used);
  const analysed = Math.max(used, asInt(row.cvs_analysed));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    plan: row.plan ?? "starter",
    annual_limit: annualLimit,
    assessments_used: used,
    cvs_analysed: analysed,
    remaining: Math.max(0, annualLimit - analysed),
    ai_cost_usd: asMoney(row.ai_cost_usd),
    user_count: asInt(row.user_count),
    active: row.active === true || row.active === "t" || row.active === 1 || row.active == null,
    created_at: row.created_at,
  };
}

const CLIENT_SELECT = `i.id, i.name, i.slug, i.kind, i.created_at,
            COALESCE(i.active, true) AS active,
            COALESCE(s.plan, 'starter') AS plan,
            COALESCE(s.annual_limit, 250) AS annual_limit,
            COALESCE(s.assessments_used, 0) AS assessments_used,
            (SELECT COUNT(*) FROM institution_users u WHERE u.institution_id = i.id) AS user_count,
            COALESCE((
              SELECT COUNT(*) FROM assessments a
              WHERE a.institution_id = i.id AND a.status = 'completed'
            ), 0) AS cvs_analysed,
            COALESCE((
              SELECT SUM(
                CASE
                  WHEN COALESCE(a.ai_cost_usd, 0) > 0 THEN a.ai_cost_usd
                  WHEN a.engine = 'openai' AND a.status = 'completed' THEN ${estimatedOpenAiCostUsd()}
                  ELSE 0
                END
              )
              FROM assessments a
              WHERE a.institution_id = i.id
            ), 0) AS ai_cost_usd`;

export async function listClients(): Promise<ClientListRow[]> {
  const rows = await dbQuery<{
    id: string;
    name: string;
    slug: string;
    kind: "platform" | "campus";
    plan: string | null;
    annual_limit: number | string | null;
    assessments_used: number | string | null;
    cvs_analysed: number | string | null;
    ai_cost_usd: number | string | null;
    user_count: number | string;
    active: boolean | string | number | null;
    created_at: string;
  }>(
    `SELECT ${CLIENT_SELECT}
     FROM institutions i
     LEFT JOIN subscriptions s ON s.institution_id = i.id
     WHERE i.kind = 'campus'
     ORDER BY i.created_at DESC`,
  );
  return rows.map(mapClient);
}

export async function getClient(id: string): Promise<ClientListRow | null> {
  const row = await dbOne<{
    id: string;
    name: string;
    slug: string;
    kind: "platform" | "campus";
    plan: string | null;
    annual_limit: number | string | null;
    assessments_used: number | string | null;
    cvs_analysed: number | string | null;
    ai_cost_usd: number | string | null;
    user_count: number | string;
    active: boolean | string | number | null;
    created_at: string;
  }>(
    `SELECT ${CLIENT_SELECT}
     FROM institutions i
     LEFT JOIN subscriptions s ON s.institution_id = i.id
     WHERE i.id = $1`,
    [id],
  );
  if (!row) return null;
  return mapClient(row);
}

export function platformUsageTotals(clients: ClientListRow[]): PlatformUsageTotals {
  return {
    clients: clients.length,
    allocated: clients.reduce((sum, c) => sum + c.annual_limit, 0),
    analysed: clients.reduce((sum, c) => sum + c.cvs_analysed, 0),
    remaining: clients.reduce((sum, c) => sum + c.remaining, 0),
    aiCostUsd: clients.reduce((sum, c) => sum + c.ai_cost_usd, 0),
  };
}

export async function listClientUsers(institutionId: string): Promise<ProvisionedUserRow[]> {
  const rows = await dbQuery<{
    id: string;
    institution_id: string;
    email: string;
    display_name: string;
    role: string;
    has_password: boolean | string | number;
    active: boolean | string | number;
    created_at: string;
  }>(
    `SELECT id, institution_id, email, display_name, role, created_at,
            COALESCE(active, true) AS active,
            (length(password_hash) >= 20) AS has_password
     FROM institution_users
     WHERE institution_id = $1
     ORDER BY created_at ASC`,
    [institutionId],
  );
  return rows.map((row) => ({
    ...row,
    role: row.role === "staff" ? "staff" : "admin",
    has_password: row.has_password === true || row.has_password === "t" || row.has_password === 1,
    active: row.active === true || row.active === "t" || row.active === 1 || row.active == null,
  }));
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "campus";
  let slug = base;
  let n = 2;
  while (await dbOne<{ id: string }>("SELECT id FROM institutions WHERE slug = $1", [slug])) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export async function createClient(params: {
  name: string;
  plan: PlanId;
  annualLimit?: number;
}): Promise<InstitutionRow> {
  const name = params.name.trim();
  const id = newId("inst");
  const slug = await uniqueSlug(name);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const renewal = new Date(now.getFullYear() + 1, 0, 1).toISOString().slice(0, 10);
  const requested = Math.round(params.annualLimit ?? 0);
  if (Number.isFinite(params.annualLimit) && requested !== 0) {
    if (requested < 1) throw new Error("Allocate at least 1 CV analysis.");
    if (requested > 1_000_000) throw new Error("That allocation is too large.");
  }
  const annualLimit = requested > 0 ? requested : PLAN_LIMITS[params.plan];

  const ranking = campusAssessmentDefaults();
  await dbQuery(
    `INSERT INTO institutions (id, name, slug, kind, student_instructions, retention_days, is_demo, assessment_engine, assessment_model)
     VALUES ($1, $2, $3, 'campus', $4, 365, false, $5, $6)`,
    [id, name, slug, DEFAULT_INSTRUCTIONS, ranking.engine, ranking.model],
  );
  await dbQuery(
    `INSERT INTO subscriptions (id, institution_id, plan, annual_limit, assessments_used, period_start, renewal_date)
     VALUES ($1, $2, $3, $4, 0, $5::date, $6::date)`,
    [newId("sub"), id, params.plan, annualLimit, periodStart, renewal],
  );
  await dbQuery(
    `INSERT INTO usage (id, institution_id, period_start, assessments_used)
     VALUES ($1, $2, $3::date, 0)`,
    [newId("use"), id, periodStart],
  );

  const row = await dbOne<InstitutionRow>(
    `SELECT id, name, slug, kind, logo_url, branding, student_instructions, retention_days, show_student_identities,
            COALESCE(is_demo, false) AS is_demo,
            COALESCE(assessment_engine, 'heuristic') AS assessment_engine,
            COALESCE(assessment_model, '') AS assessment_model
     FROM institutions WHERE id = $1`,
    [id],
  );
  if (!row) throw new Error("Failed to create client.");
  return row;
}

export async function updateClientAllocation(params: {
  institutionId: string;
  annualLimit: number;
  plan?: PlanId;
}): Promise<ClientListRow | null> {
  const annualLimit = Math.round(params.annualLimit);
  if (!Number.isFinite(annualLimit) || annualLimit < 1) {
    throw new Error("Allocate at least 1 CV analysis.");
  }
  if (annualLimit > 1_000_000) {
    throw new Error("That allocation is too large.");
  }
  const existing = await dbOne<{ institution_id: string }>(
    `SELECT institution_id FROM subscriptions WHERE institution_id = $1`,
    [params.institutionId],
  );
  if (!existing) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const renewal = new Date(now.getFullYear() + 1, 0, 1).toISOString().slice(0, 10);
    await dbQuery(
      `INSERT INTO subscriptions (id, institution_id, plan, annual_limit, assessments_used, period_start, renewal_date)
       VALUES ($1, $2, $3, $4, 0, $5::date, $6::date)`,
      [newId("sub"), params.institutionId, params.plan ?? "institution", annualLimit, periodStart, renewal],
    );
  } else if (params.plan) {
    await dbQuery(
      `UPDATE subscriptions SET annual_limit = $2, plan = $3 WHERE institution_id = $1`,
      [params.institutionId, annualLimit, params.plan],
    );
  } else {
    await dbQuery(
      `UPDATE subscriptions SET annual_limit = $2 WHERE institution_id = $1`,
      [params.institutionId, annualLimit],
    );
  }
  return getClient(params.institutionId);
}

export async function setClientActive(institutionId: string, active: boolean): Promise<ClientListRow | null> {
  const existing = await getClient(institutionId);
  if (!existing || existing.kind !== "campus") return null;
  await dbQuery(`UPDATE institutions SET active = $2 WHERE id = $1`, [institutionId, active]);
  return getClient(institutionId);
}

export async function setClientUserActive(
  institutionId: string,
  userId: string,
  active: boolean,
): Promise<ProvisionedUserRow | null> {
  await dbQuery(
    `UPDATE institution_users SET active = $3 WHERE id = $1 AND institution_id = $2`,
    [userId, institutionId, active],
  );
  const users = await listClientUsers(institutionId);
  return users.find((u) => u.id === userId) ?? null;
}

export async function emailTaken(email: string): Promise<boolean> {
  const row = await dbOne<{ id: string }>(
    "SELECT id FROM institution_users WHERE lower(email) = lower($1)",
    [email.trim()],
  );
  return Boolean(row);
}

export async function addClientUser(params: {
  institutionId: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  password?: string;
}): Promise<{ user: ProvisionedUserRow; tempPassword: string }> {
  const email = params.email.trim().toLowerCase();
  const displayName = params.name.trim();
  const tempPassword = params.password?.trim() || generateTempPassword();
  const id = newId("usr");
  const hash = bcrypt.hashSync(tempPassword, 10);

  await dbQuery(
    `INSERT INTO institution_users (id, institution_id, email, display_name, role, password_hash, active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [id, params.institutionId, email, displayName, params.role, hash],
  );

  return {
    tempPassword,
    user: {
      id,
      institution_id: params.institutionId,
      email,
      display_name: displayName,
      role: params.role,
      has_password: true,
      active: true,
      created_at: new Date().toISOString(),
    },
  };
}
