import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * Resolves the caller of an API route from their Supabase access token.
 *
 * Blueprint Ch.3.2 and Ch.7: RLS protects normal data access, but these routes
 * run with service-role credentials that bypass RLS, so the caller's identity
 * has to be established explicitly here rather than trusted from the request
 * body. Previously the payment routes accepted a userId straight from the
 * client, which let anyone act as anyone.
 */
export async function requireUser(request) {
  const header = request.headers.get("authorization") || "";

  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return { user: null, error: unauthorized("Missing authentication token.") };
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: unauthorized("Invalid or expired session.") };
  }

  return { user: data.user, supabase, error: null };
}

function unauthorized(message) {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Standard error response. Blueprint Ch.26.3: raw technical errors must never
 * reach the user, so Stripe internals are logged server-side and a plain
 * message is returned instead.
 */
export function apiError(message, status = 400, logContext) {
  if (logContext) {
    console.error("[sredi:api]", message, logContext);
  }

  return NextResponse.json({ error: message }, { status });
}
