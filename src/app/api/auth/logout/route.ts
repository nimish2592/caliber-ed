import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { requestOrigin } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", requestOrigin(request)), 303);
}
