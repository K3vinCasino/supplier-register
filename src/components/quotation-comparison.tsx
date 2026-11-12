import Link from "next/link";
import { CheckCircle2, Info, Pencil, Trophy } from "lucide-react";
import type { Rfq } from "@/types/database";
import type { QuotationWithSupplier } from "@/lib/data/rfqs";
import { analyseComparison } from "@/lib/comparison";
import { GST_SHORT_LABELS, unitLabel } from "@/lib/constants";
import { compareDecimal, formatAUD, formatQuantity, formatRate } from "@/lib/money";
import { formatDate, todayISO } from "@/lib/format";
import { awardQuotation, clearAward } from "@/app/(app)/rfqs/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { cn } from "@/lib/utils";

/**
 * Side-by-side comparison of every quotation received for one RFQ.
 * Mobile: stacked cards. Desktop: a table.
 * The cheapest quote is highlighted ONLY when quotes are like-for-like
 * (see src/lib/comparison.ts). Awarding is always a manual decision.
 */
export function QuotationComparison({ rfq, quotes }: { rfq: Rfq; quotes: QuotationWithSupplier[] }) {
  const result = analyseComparison(
    { quantity: rfq.quantity, unit: rfq.unit },
    quotes.map((q) => ({
      id: q.id,
      supplierName: q.supplier.company_name,
      quantity: q.quantity,
      unit: q.unit,
      gstTreatment: q.gst_treatment,
      scopeComplete: q.scope_complete,
      totalExGst: q.total_ex_gst,
    })),
  );
  const cheapest = new Set(result.cheapestIds);
  const today = todayISO();
  const hasAward = quotes.some((q) => q.is_awarded);

  const flags = (q: QuotationWithSupplier) => (
    <>
      {cheapest.has(q.id) && (
        <Badge tone="green">
          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> Cheapest
        </Badge>
      )}
      {q.is_awarded && (
        <Badge tone="green" className="bg-emerald-600 text-white ring-emerald-600">
          <Trophy className="mr-1 h-3 w-3" aria-hidden /> Awarded
        </Badge>
      )}
      {!q.scope_complete && <Badge tone="red">Partial scope</Badge>}
      {q.unit !== rfq.unit && <Badge tone="amber">Different unit</Badge>}
      {q.unit === rfq.unit && compareDecimal(q.quantity, rfq.quantity) !== 0 && <Badge tone="amber">Different qty</Badge>}
      {q.valid_until && q.valid_until < today && <Badge tone="red">Expired</Badge>}
    </>
  );

  const actions = (q: QuotationWithSupplier) => (
    <div className="flex flex-wrap gap-2">
      <LinkButton href={`/rfqs/${rfq.id}/quotes/${q.id}/edit`} variant="secondary" size="sm">
        <Pencil className="h-4 w-4" aria-hidden /> Edit
      </LinkButton>
      {q.is_awarded ? (
        <form action={clearAward.bind(null, rfq.id)}>
          <ConfirmSubmitButton size="sm" confirmMessage="Remove the award from this supplier?">
            Remove award
          </ConfirmSubmitButton>
        </form>
      ) : (
        <form action={awardQuotation.bind(null, q.id, rfq.id)}>
          <ConfirmSubmitButton
            size="sm"
            variant="dark"
            confirmMessage={`Mark ${q.supplier.company_name} as the successful supplier?${hasAward ? " This replaces the current award." : ""}`}
          >
            <Trophy className="h-4 w-4" aria-hidden /> Mark successful
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {quotes.length >= 2 && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border px-4 py-3 text-sm",
            result.comparable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700",
          )}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {result.comparable ? (
            <p>Quotes are like-for-like. Cheapest is highlighted by total ex GST. Check the scope before you award.</p>
          ) : (
            <div>
              <p className="font-semibold">Cheapest not highlighted. These quotes are not directly comparable:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {quotes.map((q) => (
          <li key={q.id}>
            <Card
              className={cn(
                "p-4",
                cheapest.has(q.id) && "border-emerald-400 ring-2 ring-emerald-200",
                q.is_awarded && "border-emerald-600 ring-2 ring-emerald-300",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/suppliers/${q.supplier.id}`} className="font-semibold text-slate-900 hover:text-amber-700">
                    {q.supplier.company_name}
                  </Link>
                  {q.quote_reference && <p className="text-xs text-slate-500">Ref {q.quote_reference}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{formatAUD(q.total_ex_gst)}</p>
                  <p className="text-xs text-slate-500">ex GST · {formatAUD(q.total_inc_gst)} inc</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">{flags(q)}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Unit rate</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatRate(q.unit_rate)}/{unitLabel(q.unit)}{" "}
                  <span className="text-xs font-normal text-slate-500">{GST_SHORT_LABELS[q.gst_treatment]}</span>
                </dd>
                <dt className="text-slate-500">Quantity</dt>
                <dd className="text-right text-slate-800">
                  {formatQuantity(q.quantity)} {unitLabel(q.unit)}
                </dd>
                <dt className="text-slate-500">Delivery</dt>
                <dd className="text-right text-slate-800">{formatAUD(q.delivery_cost)}</dd>
                <dt className="text-slate-500">Lead time</dt>
                <dd className="text-right text-slate-800">{q.lead_time ?? "—"}</dd>
                <dt className="text-slate-500">Received</dt>
                <dd className="text-right text-slate-800">{formatDate(q.date_received)}</dd>
                <dt className="text-slate-500">Valid until</dt>
                <dd className="text-right text-slate-800">{formatDate(q.valid_until)}</dd>
              </dl>
              {q.notes && <p className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-2 text-sm text-slate-700">{q.notes}</p>}
              <div className="mt-3 border-t border-slate-100 pt-3">{actions(q)}</div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3 text-right">Unit rate</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3 text-right">Delivery</th>
              <th className="px-3 py-3 text-right">Total ex GST</th>
              <th className="px-3 py-3 text-right">Total inc GST</th>
              <th className="px-3 py-3">Lead time</th>
              <th className="px-3 py-3">Received</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <tr
                key={q.id}
                className={cn("align-top", cheapest.has(q.id) && "bg-emerald-50", q.is_awarded && "bg-emerald-100/60")}
              >
                <td className="px-3 py-3">
                  <Link href={`/suppliers/${q.supplier.id}`} className="font-semibold text-slate-900 hover:text-amber-700">
                    {q.supplier.company_name}
                  </Link>
                  {q.quote_reference && <div className="text-xs text-slate-500">Ref {q.quote_reference}</div>}
                  <div className="mt-1 flex flex-wrap gap-1">{flags(q)}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  {formatRate(q.unit_rate)}/{unitLabel(q.unit)}
                  <div className="text-xs text-slate-500">{GST_SHORT_LABELS[q.gst_treatment]}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  {formatQuantity(q.quantity)} {unitLabel(q.unit)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">{formatAUD(q.delivery_cost)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900">{formatAUD(q.total_ex_gst)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right">{formatAUD(q.total_inc_gst)}</td>
                <td className="px-3 py-3">{q.lead_time ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatDate(q.date_received)}
                  {q.valid_until && <div className="text-xs text-slate-500">Valid to {formatDate(q.valid_until)}</div>}
                </td>
                <td className="px-3 py-3">{actions(q)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
