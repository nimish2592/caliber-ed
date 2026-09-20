import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import {
  clearGoogleStateCookie,
  exchangeGoogleCode,
  readGoogleStateCookie,
} from "@/lib/auth/google";
import { canAccessAdmin, canSignIn, findUserByEmail, sessionFromUser, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

function loginRedirect(error: string) {
  return NextResponse.redirect(`${appConfig.appUrl}/login?error=${encodeURIComponent(error)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error === "access_denied") {
    await clearGoogleStateCookie();
    return loginRedirect("oauth_denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = await readGoogleStateCookie();
  await clearGoogleStateCookie();

  if (!code || !state || !expected || state !== expected) {
    return loginRedirect("oauth_failed");
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const user = await findUserByEmail(profile.email);
    if (!user) return loginRedirect("not_provisioned");
    if (!canSignIn(user)) return loginRedirect("deactivated");

    const session = sessionFromUser(user);
    await setSessionCookie(session);
    return NextResponse.redirect(`${appConfig.appUrl}${canAccessAdmin(session) ? "/admin" : "/"}`);
  } catch {
    return loginRedirect("oauth_failed");
  }
}
