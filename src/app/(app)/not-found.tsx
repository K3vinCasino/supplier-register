import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Not found</h1>
      <p className="mt-2 text-sm text-slate-600">This record does not exist, or you do not have access to it.</p>
      <LinkButton href="/" className="mt-4">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
