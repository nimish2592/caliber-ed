import { NextResponse } from "next/server";
import { canAccessAdmin, canSignIn, findUserByEmail, sessionFromUser, setSessionCookie } from "@/lib/auth/session";
import { createSupabaseAuthClient, requestOrigin } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function loginRedirect(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error === "access_denied") {
    return loginRedirect(origin, "oauth_denied");
  }
  if (error) {
    return loginRedirect(origin, "oauth_failed");
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return loginRedirect(origin, "oauth_failed");
  }

  try {
    const supabase = await createSupabaseAuthClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    const email = (
      data.session?.user?.email ||
      (typeof data.session?.user?.user_metadata?.email === "string"
        ? data.session.user.user_metadata.email
        : "")
    )
      .trim()
      .toLowerCase();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

    if (exchangeError || !email) {
      console.error("[google] supabase oauth exchange failed", exchangeError);
      return loginRedirect(origin, "oauth_failed");
    }

    const user = await findUserByEmail(email);
    if (!user) return loginRedirect(origin, "not_provisioned");
    if (!canSignIn(user)) return loginRedirect(origin, "deactivated");

    const session = sessionFromUser(user);
    await setSessionCookie(session);
    return NextResponse.redirect(`${origin}${canAccessAdmin(session) ? "/admin" : "/"}`);
  } catch (err) {
    console.error("[google] supabase oauth callback failed", err);
    return loginRedirect(origin, "oauth_failed");
  }
}
