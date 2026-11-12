import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { listProjectNames, listRfqs } from "@/lib/data/rfqs";
import { RFQ_STATUSES, unitLabel, type RfqStatus } from "@/lib/constants";
import { formatQuantity } from "@/lib/money";
import { formatDate, rfqCode } from "@/lib/format";

export const metadata: Metadata = { title: "RFQs" };

type SearchParams = Promise<{ q?: string; status?: string; project?: string }>;

function parseStatus(value: string | undefined): RfqStatus | "open" | "awaiting" | undefined {
  if (value === "open" || value === "awaiting") return value;
  return RFQ_STATUSES.find((s) => s === value);
}

export default async function RfqsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = parseStatus(sp.status);
  const project = sp.project?.trim() || undefined;

  const { supabase } = await requireUser();
  const [rfqs, projects] = await Promise.all([listRfqs(supabase, { q, status, project }), listProjectNames(supabase)]);
  const filtered = Boolean(q || status || project);

  return (
    <>
      <PageHeader
        title="RFQs"
        subtitle={`${rfqs.length} request${rfqs.length === 1 ? "" : "s"} for quotation`}
        actions={
          <LinkButton href="/rfqs/new">
            <Plus className="h-5 w-5" aria-hidden /> Create RFQ
          </LinkButton>
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <Input name="q" type="search" placeholder="Search title, project, description…" defaultValue={q} aria-label="Search RFQs" />
        <Select name="status" defaultValue={status ?? ""} aria-label="Status">
          <option value="">All statuses</option>
          <option value="open">Open (not awarded/closed)</option>
          <option value="awaiting">Awaiting quotes</option>
          {RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select name="project" defaultValue={project ?? ""} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="dark">
          Filter
        </Button>
      </form>

      {rfqs.length === 0 ? (
        <EmptyState title={filtered ? "No RFQs match your filters" : "No RFQs yet"}>
          {filtered ? (
            <Link href="/rfqs" className="font-medium text-amber-700 underline">
              Clear filters
            </Link>
          ) : (
            "Create an RFQ each time you ask suppliers for a price."
          )}
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {rfqs.map((r) => (
              <li key={r.id}>
                <Link href={`/rfqs/${r.id}`} className="block">
                  <Card className="p-4 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{r.title}</p>
                        <p className="truncate text-sm text-slate-600">{r.project_name}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span>{rfqCode(r.id)}</span>
                      <span>
                        {formatQuantity(r.quantity)} {unitLabel(r.unit)}
                      </span>
                      <span>
                        {r.quotation_count} quote{r.quotation_count === 1 ? "" : "s"}
                      </span>
                      {r.required_by && <span>Due {formatDate(r.required_by)}</span>}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">RFQ</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Required by</th>
                  <th className="px-4 py-3 text-right">Quotes</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfqs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/rfqs/${r.id}`} className="font-semibold text-slate-900 hover:text-amber-700">
                        {r.title}
                      </Link>
                      <div className="text-xs text-slate-500">{rfqCode(r.id)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.project_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                      {formatQuantity(r.quantity)} {unitLabel(r.unit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(r.date_requested)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(r.required_by)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.quotation_count}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
