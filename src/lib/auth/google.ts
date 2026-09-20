import { readFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { appConfig } from "../config";

const STATE_COOKIE = "he_oauth_state";

let localEnvCache: Record<string, string> | null = null;

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function localEnv(): Record<string, string> {
  if (localEnvCache) return localEnvCache;
  try {
    const contents = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    localEnvCache = parseEnvFile(contents);
  } catch {
    localEnvCache = {};
  }
  return localEnvCache;
}

function googleValue(name: string): string {
  const fromProcess = (process.env[name] ?? "").trim();
  if (fromProcess) return fromProcess;
  return (localEnv()[name] ?? "").trim();
}

export function getGoogleAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = googleValue("GOOGLE_CLIENT_ID");
  const clientSecret = googleValue("GOOGLE_CLIENT_SECRET");
  const redirectUri =
    googleValue("GOOGLE_REDIRECT_URI").replace(/\/$/, "") ||
    `${appConfig.appUrl}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function googleConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleAuthConfig();
  return Boolean(clientId && clientSecret);
}

export function googleRedirectUri(): string {
  return getGoogleAuthConfig().redirectUri;
}

export function googleAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function setGoogleStateCookie(state: string): Promise<void> {
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function readGoogleStateCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(STATE_COOKIE)?.value ?? null;
}

export async function clearGoogleStateCookie(): Promise<void> {
  const store = await cookies();
  store.delete(STATE_COOKIE);
}

export type GoogleProfile = {
  email: string;
  name: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = getGoogleAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || "Google token exchange failed.");
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  const email = profile.email?.trim().toLowerCase() ?? "";
  if (!profileRes.ok || !email) {
    throw new Error("Google did not return an email address.");
  }

  return {
    email,
    name: profile.name?.trim() || email.split("@")[0] || "User",
  };
}
