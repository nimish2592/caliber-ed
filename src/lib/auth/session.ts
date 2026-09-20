import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appConfig } from "../config";
import { dbOne } from "../db/client";
import { DEMO_INSTITUTION_ID } from "../db/seed";
import { isPlatformAdminEmail } from "./platformAdmin";

export type InstitutionRole = "admin" | "staff";
export type WorkspaceMode = "demo" | "live";

export type SessionUser = {
  userId: string;
  institutionId: string;
  homeInstitutionId: string;
  email: string;
  role: InstitutionRole;
  displayName: string;
  platform: boolean;
  demo: boolean;
  workspaceMode: WorkspaceMode;
};

const COOKIE = "he_session";

function secretKey() {
  const fromEnv = (process.env.AUTH_SECRET ?? "").trim();
  if (process.env.NODE_ENV === "production" && !fromEnv) {
    throw new Error("Missing required environment variable AUTH_SECRET");
  }
  return new TextEncoder().encode(fromEnv || appConfig.authSecret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    inst: user.institutionId,
    home: user.homeInstitutionId,
    email: user.email,
    role: user.role,
    name: user.displayName,
    platform: user.platform,
    demo: user.demo,
    ws: user.workspaceMode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.inst !== "string" || typeof payload.email !== "string") {
      return null;
    }
    const homeInstitutionId =
      typeof payload.home === "string" && payload.home ? payload.home : payload.inst;
    const workspaceMode: WorkspaceMode = payload.ws === "demo" ? "demo" : "live";
    const institutionId = workspaceMode === "demo" ? DEMO_INSTITUTION_ID : homeInstitutionId;
    return {
      userId: payload.sub,
      institutionId,
      homeInstitutionId,
      email: payload.email,
      role: payload.role === "staff" ? "staff" : "admin",
      displayName: typeof payload.name === "string" ? payload.name : "",
      platform: payload.platform === true,
      workspaceMode,
      demo: workspaceMode === "demo" || institutionId === DEMO_INSTITUTION_ID,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export type InstitutionUserRow = {
  id: string;
  institution_id: string;
  email: string;
  display_name: string;
  role: InstitutionRole;
  password_hash: string;
  kind: "platform" | "campus";
  is_demo: boolean;
  active: boolean;
  institution_active: boolean;
};

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export async function findUserByEmail(email: string): Promise<InstitutionUserRow | null> {
  const row = await dbOne<InstitutionUserRow>(
    `SELECT u.id, u.institution_id, u.email, u.display_name, u.role, u.password_hash, i.kind,
            COALESCE(i.is_demo, false) AS is_demo,
            COALESCE(u.active, true) AS active,
            COALESCE(i.active, true) AS institution_active
     FROM institution_users u
     JOIN institutions i ON i.id = u.institution_id
     WHERE lower(u.email) = lower($1)`,
    [email.trim()],
  );
  if (!row) return null;
  return {
    ...row,
    is_demo: asBool(row.is_demo),
    active: asBool(row.active),
    institution_active: asBool(row.institution_active),
  };
}

export async function findDemoUser(): Promise<InstitutionUserRow | null> {
  const row =
    (await dbOne<InstitutionUserRow>(
      `SELECT u.id, u.institution_id, u.email, u.display_name, u.role, u.password_hash, i.kind,
              COALESCE(i.is_demo, false) AS is_demo,
              COALESCE(u.active, true) AS active,
              COALESCE(i.active, true) AS institution_active
       FROM institution_users u
       JOIN institutions i ON i.id = u.institution_id
       WHERE u.institution_id = $1 AND lower(u.email) = lower($2)
       LIMIT 1`,
      [DEMO_INSTITUTION_ID, appConfig.demoAdminEmail],
    )) ??
    (await dbOne<InstitutionUserRow>(
      `SELECT u.id, u.institution_id, u.email, u.display_name, u.role, u.password_hash, i.kind,
              COALESCE(i.is_demo, false) AS is_demo,
              COALESCE(u.active, true) AS active,
              COALESCE(i.active, true) AS institution_active
       FROM institution_users u
       JOIN institutions i ON i.id = u.institution_id
       WHERE i.is_demo = true OR u.institution_id = $1
       ORDER BY u.created_at ASC
       LIMIT 1`,
      [DEMO_INSTITUTION_ID],
    ));
  if (!row) return null;
  return {
    ...row,
    is_demo: true,
    active: asBool(row.active),
    institution_active: asBool(row.institution_active),
  };
}

export function hasPassword(hash: string | null | undefined): boolean {
  return Boolean(hash && hash.length >= 20);
}

export function sessionFromUser(user: InstitutionUserRow): SessionUser {
  const homeInstitutionId = user.institution_id;
  const homeIsDemo = user.is_demo || homeInstitutionId === DEMO_INSTITUTION_ID;
  const workspaceMode: WorkspaceMode = homeIsDemo ? "demo" : "live";
  return {
    userId: user.id,
    institutionId: homeInstitutionId,
    homeInstitutionId,
    email: user.email,
    role: user.role === "staff" ? "staff" : "admin",
    displayName: user.display_name,
    platform: user.kind === "platform",
    workspaceMode,
    demo: workspaceMode === "demo",
  };
}

export async function setWorkspaceMode(mode: WorkspaceMode): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Sign in required.");
  }
  if (mode === "demo") {
    const demo = await dbOne<{ id: string }>(
      "SELECT id FROM institutions WHERE id = $1 AND COALESCE(is_demo, false) = true",
      [DEMO_INSTITUTION_ID],
    );
    if (!demo) {
      throw new Error("Demo data is not available yet.");
    }
  }
  const homeInstitutionId = session.homeInstitutionId || session.institutionId;
  const institutionId = mode === "demo" ? DEMO_INSTITUTION_ID : homeInstitutionId;
  const next: SessionUser = {
    ...session,
    homeInstitutionId,
    institutionId,
    workspaceMode: mode,
    demo: mode === "demo" || institutionId === DEMO_INSTITUTION_ID,
  };
  await setSessionCookie(next);
  return next;
}

export function canAccessAdmin(session: SessionUser | null | undefined): boolean {
  if (!session?.platform || session.role !== "admin") return false;
  return isPlatformAdminEmail(session.email);
}

/** User may sign in only when both the account and its organization are active. */
export function canSignIn(user: InstitutionUserRow): boolean {
  if (!user.active) return false;
  if (user.kind === "platform") return true;
  return user.institution_active;
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    throw new Error("Platform admin access required");
  }
  return session!;
}

