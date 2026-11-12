import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAuthRoute } from "@/lib/auth-paths";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Runs before every page request (called from src/proxy.ts):
 *   1. Refreshes the user's login session cookie if it is about to expire.
 *   2. Redirects logged-out visitors to /login.
 *
 * This is the first line of defence. Pages and Server Actions check again
 * (requireUser), and the database checks a third time (Row Level Security).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims — it can cause
  // users to be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const decision = decideAuthRoute(request.nextUrl.pathname, request.nextUrl.search, isLoggedIn);
  if (decision.action === "redirect") {
    const redirectResponse = NextResponse.redirect(new URL(decision.to, request.url));
    // Keep any refreshed session cookies on the redirect
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }

  return response;
}
