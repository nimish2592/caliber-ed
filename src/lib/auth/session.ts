import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appConfig } from "../config";
import { dbOne } from "../db/client";
import { isPlatformAdminEmail } from "./platformAdmin";

export type InstitutionRole = "admin" | "staff";

export type SessionUser = {
  userId: string;
  institutionId: string;
  email: string;
  role: InstitutionRole;
  displayName: string;
  platform: boolean;
  demo: boolean;
};

const COOKIE = "he_session";
const DEMO_INSTITUTION_ID = "inst_demo";

function secretKey() {
  return new TextEncoder().encode(appConfig.authSecret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    inst: user.institutionId,
    email: user.email,
    role: user.role,
    name: user.displayName,
    platform: user.platform,
    demo: user.demo,
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
    return {
      userId: payload.sub,
      institutionId: payload.inst,
      email: payload.email,
      role: payload.role === "staff" ? "staff" : "admin",
      displayName: typeof payload.name === "string" ? payload.name : "",
      platform: payload.platform === true,
      demo: payload.demo === true,
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
  const row = await dbOne<InstitutionUserRow>(
    `SELECT u.id, u.institution_id, u.email, u.display_name, u.role, u.password_hash, i.kind,
            COALESCE(i.is_demo, false) AS is_demo,
            COALESCE(u.active, true) AS active,
            COALESCE(i.active, true) AS institution_active
     FROM institution_users u
     JOIN institutions i ON i.id = u.institution_id
     WHERE i.is_demo = true OR u.institution_id = $1
     ORDER BY CASE WHEN lower(u.email) = lower($2) THEN 0 ELSE 1 END, u.created_at ASC
     LIMIT 1`,
    [DEMO_INSTITUTION_ID, appConfig.demoAdminEmail],
  );
  if (!row) return null;
  return {
    ...row,
    is_demo: true,
    active: asBool(row.active),
    institution_active: asBool(row.institution_active),
  };
}

export function sessionFromUser(user: InstitutionUserRow): SessionUser {
  return {
    userId: user.id,
    institutionId: user.institution_id,
    email: user.email,
    role: user.role === "staff" ? "staff" : "admin",
    displayName: user.display_name,
    platform: user.kind === "platform",
    demo: user.is_demo || user.institution_id === DEMO_INSTITUTION_ID,
  };
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

export function hasPassword(hash: string | null | undefined): boolean {
  return Boolean(hash && hash.length >= 20);
}
