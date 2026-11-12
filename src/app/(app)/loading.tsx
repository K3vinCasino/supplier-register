/** Shown instantly while a page's data is loading (useful on slow mobile data). */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading" role="status">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="h-12 rounded-lg bg-slate-200" />
      <div className="h-28 rounded-xl bg-slate-200" />
      <div className="h-28 rounded-xl bg-slate-200" />
    </div>
  );
}
