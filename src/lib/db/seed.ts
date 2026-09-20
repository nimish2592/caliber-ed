import bcrypt from "bcryptjs";
import { appConfig, PLAN_LIMITS } from "../config";
import { DEFAULT_HIGHER_ED_PROFILE } from "../assessment/profiles";
import { DEFAULT_FOCUS_SKILLS, DEFAULT_HE_CONTEXT } from "../goals/defaults";
import type { DbClient } from "./client";

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[0-9]+/g, " ").replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Platform Admin";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const PLATFORM_INSTITUTION_ID = "inst_platform";
export const DEMO_INSTITUTION_ID = "inst_demo";
export const DEFAULT_PROFILE_ID = "prof_higher_ed_default";
export const DEMO_EVENT_ID = "evt_demo_fair";
export const DEMO_GOAL_ID = "goal_demo_placement";

export async function seedDatabase(db: DbClient): Promise<void> {
  const existing = await db.query<{ id: string }>("SELECT id FROM institutions WHERE id = $1", [
    PLATFORM_INSTITUTION_ID,
  ]);
  if (existing.rows.length === 0) {
    await seedInstitutions(db);
  }
  await ensurePlatformAdmin(db);
  await ensureDemoGoal(db);
}

async function seedInstitutions(db: DbClient): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const renewal = new Date(now.getFullYear() + 1, 0, 1).toISOString().slice(0, 10);
  const passwordHash = bcrypt.hashSync(appConfig.demoAdminPassword, 10);

  await db.query(
    `INSERT INTO institutions (id, name, slug, kind, student_instructions, retention_days)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      PLATFORM_INSTITUTION_ID,
      "Caliber Higher Ed",
      "caliber-higher-ed",
      "platform",
      "Upload your CV to get a career-readiness assessment.",
      365,
    ],
  );

  await db.query(
    `INSERT INTO institutions (id, name, slug, kind, student_instructions, retention_days)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      DEMO_INSTITUTION_ID,
      "Demo University",
      "demo-university",
      "campus",
      "Welcome to Demo University Career Readiness. Upload your CV for an assessment you can use for internships and placements.",
      365,
    ],
  );

  await db.query(
    `INSERT INTO institution_users (id, institution_id, email, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id("usr"), DEMO_INSTITUTION_ID, appConfig.demoAdminEmail, "Campus Admin", "admin", passwordHash],
  );

  await db.query(
    `INSERT INTO assessment_profiles (id, institution_id, name, slug, dimensions, is_default)
     VALUES ($1, NULL, $2, $3, $4::jsonb, true)`,
    [
      DEFAULT_PROFILE_ID,
      DEFAULT_HIGHER_ED_PROFILE.name,
      DEFAULT_HIGHER_ED_PROFILE.slug,
      JSON.stringify(DEFAULT_HIGHER_ED_PROFILE.dimensions),
    ],
  );

  for (const inst of [PLATFORM_INSTITUTION_ID, DEMO_INSTITUTION_ID]) {
    const plan = inst === DEMO_INSTITUTION_ID ? "institution" : "campus";
    await db.query(
      `INSERT INTO subscriptions (id, institution_id, plan, annual_limit, assessments_used, period_start, renewal_date)
       VALUES ($1, $2, $3, $4, 0, $5::date, $6::date)`,
      [id("sub"), inst, plan, PLAN_LIMITS[plan], periodStart, renewal],
    );
    await db.query(
      `INSERT INTO usage (id, institution_id, period_start, assessments_used)
       VALUES ($1, $2, $3::date, 0)`,
      [id("use"), inst, periodStart],
    );
  }

  await db.query(
    `INSERT INTO events (id, institution_id, name, public_slug, public_code, instructions)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      DEMO_EVENT_ID,
      DEMO_INSTITUTION_ID,
      "ABC University Career Fair 2026",
      "career-fair-2026",
      "CF-2026-DEMO",
      "Scan, upload your CV, and get a career-readiness assessment in a few minutes.",
    ],
  );
}

async function ensurePlatformAdmin(db: DbClient): Promise<void> {
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM institution_users WHERE institution_id = $1 AND lower(email) = lower($2)",
    [PLATFORM_INSTITUTION_ID, appConfig.platformAdminEmail],
  );
  if (existing.rows.length > 0) return;
  const passwordHash = bcrypt.hashSync(appConfig.platformAdminPassword, 10);
  await db.query(
    `INSERT INTO institution_users (id, institution_id, email, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id("usr"), PLATFORM_INSTITUTION_ID, appConfig.platformAdminEmail, displayNameFromEmail(appConfig.platformAdminEmail), "admin", passwordHash],
  );
}

async function ensureDemoGoal(db: DbClient): Promise<void> {
  await db.query(
    `INSERT INTO goals (id, institution_id, goal_code, title, context_text, focus_skills, status, public_slug, public_code, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'active', $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      DEMO_GOAL_ID,
      DEMO_INSTITUTION_ID,
      "GL-001",
      "Internship & Placement Readiness",
      DEFAULT_HE_CONTEXT,
      JSON.stringify(DEFAULT_FOCUS_SKILLS),
      "placement-readiness",
      "GL-001",
      appConfig.demoAdminEmail,
    ],
  );
}
