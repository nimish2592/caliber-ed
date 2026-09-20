import { NextResponse } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: isSupabaseAuthConfigured() });
}
