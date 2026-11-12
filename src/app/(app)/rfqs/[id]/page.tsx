import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuotationComparison } from "@/components/quotation-comparison";
import { requireUser } from "@/lib/supabase/server";
import { getRfq, listQuotationsForRfq } from "@/lib/data/rfqs";
import { idSchema } from "@/lib/validation";
import { unitLabel } from "@/lib/constants";
import { formatQuantity } from "@/lib/money";
import { formatDate, rfqCode } from "@/lib/format";

export const metadata: Metadata = { title: "RFQ" };

export default async function RfqPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { supabase } = await requireUser();
  const [rfq, quotes] = await Promise.all([getRfq(supabase, parsedId.data), listQuotationsForRfq(supabase, parsedId.data)]);
  if (!rfq) notFound();

  return (
    <>
      <PageHeader
        title={rfq.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {rfqCode(rfq.id)} · {rfq.project_name} <StatusBadge status={rfq.status} />
          </span>
        }
        backHref="/rfqs"
        backLabel="RFQs"
        actions={
          <LinkButton href={`/rfqs/${rfq.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-4 w-4" aria-hidden /> Edit / status
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-semibold text-slate-900">
                {formatQuantity(rfq.quantity)} {unitLabel(rfq.unit)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Requested</dt>
              <dd className="font-semibold text-slate-900">{formatDate(rfq.date_requested)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Required by</dt>
              <dd className="font-semibold text-slate-900">{formatDate(rfq.required_by)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Quotes received</dt>
              <dd className="font-semibold text-slate-900">{quotes.length}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
            <p className="mb-1 font-semibold text-slate-700">Description</p>
            <p className="whitespace-pre-wrap text-slate-800">{rfq.description}</p>
            {rfq.notes && (
              <>
                <p className="mb-1 mt-3 font-semibold text-slate-700">Notes</p>
                <p className="whitespace-pre-wrap text-slate-800">{rfq.notes}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Quotation comparison</h2>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/prices?q=${encodeURIComponent(rfq.title)}`} variant="secondary" size="sm">
            <Search className="h-4 w-4" aria-hidden /> Past prices
          </LinkButton>
          <LinkButton href={`/rfqs/${rfq.id}/quotes/new`} size="sm">
            <Plus className="h-4 w-4" aria-hidden /> Add quotation
          </LinkButton>
        </div>
      </div>

      {quotes.length === 0 ? (
        <EmptyState title="No quotations recorded yet">
          When a supplier replies,{" "}
          <Link href={`/rfqs/${rfq.id}/quotes/new`} className="font-medium text-amber-700 underline">
            add their quotation
          </Link>
          .
        </EmptyState>
      ) : (
        <QuotationComparison rfq={rfq} quotes={quotes} />
      )}
    </>
  );
}
