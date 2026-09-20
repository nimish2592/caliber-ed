import { cookies } from "next/headers";
import { appConfig } from "../config";

const STATE_COOKIE = "he_oauth_state";

export function googleConfigured(): boolean {
  return Boolean(appConfig.googleClientId && appConfig.googleClientSecret);
}

export function googleRedirectUri(): string {
  return `${appConfig.appUrl}/api/auth/google/callback`;
}

export function googleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: appConfig.googleClientId,
    redirect_uri: googleRedirectUri(),
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
  const body = new URLSearchParams({
    code,
    client_id: appConfig.googleClientId,
    client_secret: appConfig.googleClientSecret,
    redirect_uri: googleRedirectUri(),
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
