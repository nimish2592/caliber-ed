import bcrypt from "bcryptjs";
import { PLAN_LIMITS, type PlanId } from "../config";
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
  user_count: number;
  created_at: string;
};

export type ProvisionedUserRow = {
  id: string;
  institution_id: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  has_password: boolean;
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

export async function listClients(): Promise<ClientListRow[]> {
  const rows = await dbQuery<{
    id: string;
    name: string;
    slug: string;
    kind: "platform" | "campus";
    plan: string | null;
    annual_limit: number | string | null;
    assessments_used: number | string | null;
    user_count: number | string;
    created_at: string;
  }>(
    `SELECT i.id, i.name, i.slug, i.kind, i.created_at,
            COALESCE(s.plan, 'starter') AS plan,
            COALESCE(s.annual_limit, 250) AS annual_limit,
            COALESCE(s.assessments_used, 0) AS assessments_used,
            (SELECT COUNT(*) FROM institution_users u WHERE u.institution_id = i.id) AS user_count
     FROM institutions i
     LEFT JOIN subscriptions s ON s.institution_id = i.id
     WHERE i.kind = 'campus'
     ORDER BY i.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    plan: row.plan ?? "starter",
    annual_limit: asInt(row.annual_limit),
    assessments_used: asInt(row.assessments_used),
    user_count: asInt(row.user_count),
    created_at: row.created_at,
  }));
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
    user_count: number | string;
    created_at: string;
  }>(
    `SELECT i.id, i.name, i.slug, i.kind, i.created_at,
            COALESCE(s.plan, 'starter') AS plan,
            COALESCE(s.annual_limit, 250) AS annual_limit,
            COALESCE(s.assessments_used, 0) AS assessments_used,
            (SELECT COUNT(*) FROM institution_users u WHERE u.institution_id = i.id) AS user_count
     FROM institutions i
     LEFT JOIN subscriptions s ON s.institution_id = i.id
     WHERE i.id = $1`,
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    plan: row.plan ?? "starter",
    annual_limit: asInt(row.annual_limit),
    assessments_used: asInt(row.assessments_used),
    user_count: asInt(row.user_count),
    created_at: row.created_at,
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
    created_at: string;
  }>(
    `SELECT id, institution_id, email, display_name, role, created_at,
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
}): Promise<InstitutionRow> {
  const name = params.name.trim();
  const id = newId("inst");
  const slug = await uniqueSlug(name);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const renewal = new Date(now.getFullYear() + 1, 0, 1).toISOString().slice(0, 10);

  await dbQuery(
    `INSERT INTO institutions (id, name, slug, kind, student_instructions, retention_days)
     VALUES ($1, $2, $3, 'campus', $4, 365)`,
    [id, name, slug, DEFAULT_INSTRUCTIONS],
  );
  await dbQuery(
    `INSERT INTO subscriptions (id, institution_id, plan, annual_limit, assessments_used, period_start, renewal_date)
     VALUES ($1, $2, $3, $4, 0, $5::date, $6::date)`,
    [newId("sub"), id, params.plan, PLAN_LIMITS[params.plan], periodStart, renewal],
  );
  await dbQuery(
    `INSERT INTO usage (id, institution_id, period_start, assessments_used)
     VALUES ($1, $2, $3::date, 0)`,
    [newId("use"), id, periodStart],
  );

  const row = await dbOne<InstitutionRow>(
    `SELECT id, name, slug, kind, logo_url, branding, student_instructions, retention_days, show_student_identities
     FROM institutions WHERE id = $1`,
    [id],
  );
  if (!row) throw new Error("Failed to create client.");
  return row;
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
    `INSERT INTO institution_users (id, institution_id, email, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
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
      created_at: new Date().toISOString(),
    },
  };
}
