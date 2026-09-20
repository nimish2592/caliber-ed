import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", appConfig.appUrl), 303);
}
