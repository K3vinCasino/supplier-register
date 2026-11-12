"use client";

import { Button } from "@/components/ui/button";

/** Shown if a page throws (e.g. the database is unreachable). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page could not be loaded. Check your internet connection and try again.
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
