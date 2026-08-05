import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side routes only.
 *
 * Blueprint Ch.3.2: anything that touches money, changes authorization state,
 * or must be trusted runs server-side. Ch.7: because this client bypasses RLS,
 * every route using it must perform its own explicit authorization checks.
 *
 * This module must never be imported from a client component.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
