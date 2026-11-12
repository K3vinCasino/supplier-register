/**
 * Supabase connection settings, read from environment variables.
 *
 * These two values are designed to be public (the "publishable"/anon key only
 * grants what Row Level Security allows). NEVER put the service-role / secret
 * key in a NEXT_PUBLIC_ variable — this app does not need it at all.
 */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase settings. Copy .env.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}
