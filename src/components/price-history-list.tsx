import Link from "next/link";
import { Trophy } from "lucide-react";
import type { PriceHistoryRow } from "@/types/database";
import { GST_SHORT_LABELS, unitLabel } from "@/lib/constants";
import { formatAUD, formatQuantity, formatRate } from "@/lib/money";
import { formatDate, rfqCode } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * Historical quotation results. Cards on phones, a table on wider screens.
 * `hideSupplier` is used on a supplier's own page where the name is redundant.
 */
export function PriceHistoryList({ rows, hideSupplier = false }: { rows: PriceHistoryRow[]; hideSupplier?: boolean }) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.quotation_id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug text-slate-900">{r.description}</p>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-slate-900">{formatRate(r.unit_rate)}</p>
                  <p className="text-xs text-slate-500">
                    per {unitLabel(r.unit)} · {GST_SHORT_LABELS[r.gst_treatment]}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {!hideSupplier && (
                  <>
                    <dt className="text-slate-500">Supplier</dt>
                    <dd className="text-right">
                      <Link href={`/suppliers/${r.supplier_id}`} className="font-medium text-amber-700 underline-offset-2 hover:underline">
                        {r.supplier_name}
                      </Link>
                    </dd>
                  </>
                )}
                <dt className="text-slate-500">Date</dt>
                <dd className="text-right text-slate-800">{formatDate(r.date_received)}</dd>
                <dt className="text-slate-500">Quantity</dt>
                <dd className="text-right text-slate-800">
                  {formatQuantity(r.quantity)} {unitLabel(r.unit)}
                </dd>
                <dt className="text-slate-500">Delivery</dt>
                <dd className="text-right text-slate-800">{formatAUD(r.delivery_cost)}</dd>
                <dt className="text-slate-500">Total ex GST</dt>
                <dd className="text-right text-slate-800">{formatAUD(r.total_ex_gst)}</dd>
                <dt className="text-slate-500">Project</dt>
                <dd className="truncate text-right text-slate-800">{r.project_name}</dd>
              </dl>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Link href={`/rfqs/${r.rfq_id}`} className="text-sm font-medium text-amber-700 hover:underline">
                  {rfqCode(r.rfq_id)}: {r.rfq_title}
                </Link>
                {r.is_awarded && (
                  <Badge tone="green">
                    <Trophy className="mr-1 h-3 w-3" aria-hidden /> Awarded
                  </Badge>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Date</th>
              {!hideSupplier && <th className="px-3 py-3">Supplier</th>}
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right">Unit rate</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3 text-right">Delivery</th>
              <th className="px-3 py-3 text-right">Total ex GST</th>
              <th className="px-3 py-3">Project / RFQ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.quotation_id} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatDate(r.date_received)}</td>
                {!hideSupplier && (
                  <td className="px-3 py-3">
                    <Link href={`/suppliers/${r.supplier_id}`} className="font-medium text-slate-900 hover:text-amber-700">
                      {r.supplier_name}
                    </Link>
                  </td>
                )}
                <td className="max-w-xs px-3 py-3 text-slate-800">
                  {r.description}
                  {r.is_awarded && (
                    <Badge tone="green" className="ml-2">
                      Awarded
                    </Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span className="font-semibold text-slate-900">{formatRate(r.unit_rate)}</span>
                  <span className="block text-xs text-slate-500">
                    /{unitLabel(r.unit)} · {GST_SHORT_LABELS[r.gst_treatment]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">
                  {formatQuantity(r.quantity)} {unitLabel(r.unit)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatAUD(r.delivery_cost)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatAUD(r.total_ex_gst)}</td>
                <td className="px-3 py-3">
                  <div className="text-slate-800">{r.project_name}</div>
                  <Link href={`/rfqs/${r.rfq_id}`} className="text-xs font-medium text-amber-700 hover:underline">
                    {rfqCode(r.rfq_id)}: {r.rfq_title}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function ReferencePriceNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Reference prices only.</strong> These are historical quotations, not current or guaranteed prices. Always
      obtain a fresh quote before ordering.
    </div>
  );
}
