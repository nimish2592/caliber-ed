import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appConfig } from "../config";
import { dbOne } from "../db/client";

export type InstitutionRole = "admin" | "staff";

export type SessionUser = {
  userId: string;
  institutionId: string;
  email: string;
  role: InstitutionRole;
  displayName: string;
  platform: boolean;
};

const COOKIE = "he_session";

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
};

export async function findUserByEmail(email: string): Promise<InstitutionUserRow | null> {
  return dbOne<InstitutionUserRow>(
    `SELECT u.id, u.institution_id, u.email, u.display_name, u.role, u.password_hash, i.kind
     FROM institution_users u
     JOIN institutions i ON i.id = u.institution_id
     WHERE lower(u.email) = lower($1)`,
    [email.trim()],
  );
}

export function sessionFromUser(user: InstitutionUserRow): SessionUser {
  return {
    userId: user.id,
    institutionId: user.institution_id,
    email: user.email,
    role: user.role === "staff" ? "staff" : "admin",
    displayName: user.display_name,
    platform: user.kind === "platform",
  };
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.platform) {
    throw new Error("Platform admin access required");
  }
  return session;
}

export function hasPassword(hash: string | null | undefined): boolean {
  return Boolean(hash && hash.length >= 20);
}
