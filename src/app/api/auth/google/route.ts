import { NextResponse } from "next/server";
import {
  applyCookies,
  createSupabaseAuthClient,
  googleCallbackUrl,
  isSupabaseAuthConfigured,
  requestOrigin,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  const queued: Parameters<typeof applyCookies>[1] = [];
  const supabase = await createSupabaseAuthClient((cookies) => {
    queued.push(...cookies);
  });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: googleCallbackUrl(request),
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    console.error("[google] supabase oauth start failed", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  return applyCookies(NextResponse.redirect(data.url), queued);
}
