"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ClipboardList, HardHat, Home, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/suppliers", label: "Suppliers", icon: HardHat },
  { href: "/rfqs", label: "RFQs", icon: ClipboardList },
  { href: "/prices", label: "Prices", icon: Search },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/*
 * The current URL (usePathname) is only known at request time, so each nav is
 * rendered first without a highlighted tab (the Suspense fallback), then the
 * highlighted version streams in. This keeps the page shell instant.
 */

/** Horizontal links in the top bar — shown on tablets and desktops. */
export function DesktopNav() {
  return (
    <Suspense fallback={<DesktopNavView pathname="" />}>
      <DesktopNavActive />
    </Suspense>
  );
}

function DesktopNavActive() {
  return <DesktopNavView pathname={usePathname()} />;
}

function DesktopNavView({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium",
            isActive(pathname, href) ? "bg-slate-800 text-amber-300" : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Fixed bottom tab bar — shown on phones only. */
export function MobileNav() {
  return (
    <Suspense fallback={<MobileNavView pathname="" />}>
      <MobileNavActive />
    </Suspense>
  );
}

function MobileNavActive() {
  return <MobileNavView pathname={usePathname()} />;
}

function MobileNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900 md:hidden"
      aria-label="Main"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-amber-300" : "text-slate-400 active:text-white",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
