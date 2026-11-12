import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { requireUser } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

/**
 * Layout for every logged-in page (everything inside the (app) folder).
 * The brackets in "(app)" mean the folder name is NOT part of the URL.
 *
 * The header and navigation are static, so they appear instantly. Anything
 * that depends on the logged-in user is wrapped in <Suspense> and streams in
 * a moment later (this is how Next.js "Cache Components" works).
 *
 * Security: src/proxy.ts blocks logged-out visitors before this renders, and
 * every page and Server Action calls requireUser() again.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-400 text-sm font-black text-slate-950">
              SR
            </span>
            <span>Supplier Register</span>
          </Link>
          <DesktopNav />
          <form action={logout} className="flex items-center gap-3">
            <Suspense fallback={null}>
              <UserEmail />
            </Suspense>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </div>
      </header>

      {/* pb-28 leaves room for the mobile bottom nav. Page loading states come from loading.tsx */}
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-10 md:pt-6">{children}</main>

      <MobileNav />
    </div>
  );
}

async function UserEmail() {
  const { email } = await requireUser();
  return email ? <span className="hidden text-xs text-slate-400 lg:inline">{email}</span> : null;
}
