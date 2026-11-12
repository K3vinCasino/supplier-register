import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Promise<{ next?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-4 py-10">
      <div className="mb-8 flex items-center gap-3 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-amber-400 text-lg font-black text-slate-950">
          SR
        </span>
        <div>
          <p className="text-xl font-bold tracking-tight">Supplier Register</p>
          <p className="text-sm text-slate-400">Suppliers · RFQs · Quotations</p>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>
        <Suspense fallback={<LoginForm next="" />}>
          <LoginFormWithRedirect searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        Private application. Accounts are created by the administrator in Supabase.
      </p>
    </div>
  );
}

/** Reads ?next=… from the URL so the user returns to the page they wanted. */
async function LoginFormWithRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? ""} />;
}
