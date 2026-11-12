import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Create a Supabase client for Server Components and Server Actions.
 * It reads the user's login session from cookies, so every query runs
 * as that user and Row Level Security applies.
 *
 * Create a new client per request — never share one between requests.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Get a Supabase client AND confirm the user is logged in.
 * Use this at the top of every Server Action and protected page.
 * `getClaims()` verifies the login token rather than just trusting the cookie.
 */
export async function requireUser(): Promise<{ supabase: SupabaseServerClient; userId: string; email: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    redirect("/login");
  }
  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
