import { NextResponse } from "next/server";
import { getGoogleAuthConfig, googleConfigured } from "@/lib/auth/google";

export const runtime = "nodejs";

export async function GET() {
  const { clientId, redirectUri } = getGoogleAuthConfig();
  return NextResponse.json({
    configured: googleConfigured(),
    redirectUri,
    clientId,
  });
}
