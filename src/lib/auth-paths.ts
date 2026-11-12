/**
 * Route rules for authentication. Kept separate from proxy.ts so they can be
 * unit-tested without a running server.
 */

/** Pages that can be visited without logging in. Everything else is protected. */
const PUBLIC_PATHS = ["/login"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only allow redirects to paths inside this app after login.
 * Blocks open-redirect tricks like "//evil.com" or "https://evil.com".
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (isPublicPath(next)) return "/";
  return next;
}

export type AuthDecision = { action: "allow" } | { action: "redirect"; to: string };

/**
 * Decide what the proxy should do with a request.
 * - Not logged in + protected page → send to /login (remembering where they were going)
 * - Logged in + login page → send to the dashboard
 * - Otherwise → allow
 */
export function decideAuthRoute(pathname: string, search: string, isLoggedIn: boolean): AuthDecision {
  const isPublic = isPublicPath(pathname);
  if (!isLoggedIn && !isPublic) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return { action: "redirect", to: `/login${next}` };
  }
  if (isLoggedIn && isPublic) {
    return { action: "redirect", to: "/" };
  }
  return { action: "allow" };
}
