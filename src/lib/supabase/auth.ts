import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appConfig } from "../config";

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}

export function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const forwarded = request.headers.get("x-forwarded-proto");
    const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = forwarded || (local ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export function googleCallbackUrl(request: Request): string {
  return `${requestOrigin(request)}${GOOGLE_CALLBACK_PATH}`;
}

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createSupabaseAuthClient(onSet?: (cookies: CookieToSet[]) => void) {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    throw new Error("Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();
  return createServerClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // cookies().set throws in Server Components; Route Handlers still need the response copy.
          }
        });
        onSet?.(cookiesToSet);
      },
    },
  });
}

export function applyCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
