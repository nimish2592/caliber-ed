import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "../config";

const globalForSupabase = globalThis as unknown as {
  heSupabaseAdmin?: SupabaseClient;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseServiceRoleKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.heSupabaseAdmin) return globalForSupabase.heSupabaseAdmin;
  if (!appConfig.supabaseUrl || !appConfig.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  const client = createClient(appConfig.supabaseUrl, appConfig.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  globalForSupabase.heSupabaseAdmin = client;
  return client;
}
