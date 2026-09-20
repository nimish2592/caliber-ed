import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import {
  googleAuthorizeUrl,
  googleConfigured,
  setGoogleStateCookie,
} from "@/lib/auth/google";

export const runtime = "nodejs";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${appConfig.appUrl}/login?error=google_not_configured`);
  }
  const state = crypto.randomUUID();
  await setGoogleStateCookie(state);
  return NextResponse.redirect(googleAuthorizeUrl(state));
}
