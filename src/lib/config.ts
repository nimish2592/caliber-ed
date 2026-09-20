function requiredInProd(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return fallback;
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD?.trim() || "";

function supabaseProjectRef(): string {
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i);
  return match?.[1] ?? "";
}

function databaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;
  const ref = supabaseProjectRef();
  if (!supabaseDbPassword || !ref) return "";
  return `postgresql://postgres:${encodeURIComponent(supabaseDbPassword)}@db.${ref}.supabase.co:5432/postgres`;
}

const storageDriverEnv = (process.env.STORAGE_DRIVER ?? "").trim();
const storageDriver: "local" | "supabase" =
  storageDriverEnv === "local"
    ? "local"
    : storageDriverEnv === "supabase" || Boolean(supabaseUrl && supabaseServiceRoleKey)
      ? "supabase"
      : "local";

export const appConfig = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  authSecret: requiredInProd("AUTH_SECRET", "caliber-higher-ed-dev-secret"),
  supabaseUrl,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "",
  supabaseServiceRoleKey,
  supabaseDbPassword,
  databaseUrl: databaseUrl(),
  storageDriver,
  storageDir: process.env.STORAGE_DIR ?? ".data/uploads",
  storageUrl: process.env.STORAGE_URL?.trim() || "",
  storageBucket: process.env.STORAGE_BUCKET?.trim() || "cv-uploads",
  assessmentEngine: (process.env.ASSESSMENT_ENGINE ?? "heuristic") as "heuristic" | "openai",
  openaiKey: process.env.OPENAI_API_KEY?.trim() || "",
  openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  openaiInputUsdPerMillion: Number(process.env.OPENAI_INPUT_USD_PER_MILLION ?? 0.15) || 0.15,
  openaiOutputUsdPerMillion: Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION ?? 0.6) || 0.6,
  caliberCvApiUrl: process.env.CALIBER_CV_API_URL?.replace(/\/$/, "") || "",
  caliberCvApiKey: process.env.CALIBER_CV_API_KEY?.trim() || "",
  demoAdminEmail: (process.env.DEMO_ADMIN_EMAIL ?? "campus@demo.edu").toLowerCase(),
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD ?? "campus-demo",
  platformAdminEmail: (process.env.PLATFORM_ADMIN_EMAIL ?? "nimish.khandelwal25@gmail.com").toLowerCase(),
  platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? "platform-demo",
  /** Extra platform admins (comma-separated). Always includes the two SaaS owner Gmails. */
  platformAdminEmailsExtra: (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
};

export const PLAN_LIMITS = {
  starter: 250,
  institution: 500,
  campus: 1000,
  enterprise: 2500,
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function campusAssessmentDefaults() {
  const engine = appConfig.assessmentEngine === "openai" ? "openai" : "heuristic";
  return {
    engine,
    model: engine === "openai" ? appConfig.openaiModel : "",
  };
}
