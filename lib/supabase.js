import { createClient } from "@supabase/supabase-js";

let client = null;

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Browser Supabase client, created on first property access rather than at
 * import time.
 *
 * Constructing it at module scope broke `next build` with "supabaseUrl is
 * required" whenever the build environment had no Supabase env vars, because
 * prerendering the home route evaluates this module on the server. Deferring
 * construction keeps the build independent of runtime configuration; call sites
 * are unchanged and still use `supabase.from(...)` as before.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      if (!client) {
        client = createSupabaseClient();
      }

      const value = client[property];

      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
