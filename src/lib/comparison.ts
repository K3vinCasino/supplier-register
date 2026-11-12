import { compareDecimal } from "./money";
import { unitLabel, type GstTreatment } from "./constants";

/**
 * Quotation comparison rules.
 *
 * We only flag a "cheapest" quotation when the quotes are genuinely
 * like-for-like. Otherwise a cheaper-looking quote might be for less
 * quantity, a different unit, partial scope, or a different GST basis.
 *
 * Quotes are comparable when ALL of them:
 *   1. cover the full RFQ scope (scope_complete = true),
 *   2. use the same unit of measurement as the RFQ,
 *   3. are for the same quantity as the RFQ, and
 *   4. share the same GST basis (all taxable, or all GST-free).
 *
 * The comparison uses the ex-GST total (GST is normally claimable as an
 * input tax credit, and it removes the inc/ex entry difference).
 */

export interface ComparisonRfq {
  quantity: string | number;
  unit: string;
}

export interface ComparisonQuote {
  id: number;
  supplierName: string;
  quantity: string | number;
  unit: string;
  gstTreatment: GstTreatment;
  scopeComplete: boolean;
  totalExGst: string | number;
}

export interface ComparisonResult {
  /** True when every quote is like-for-like and there are at least 2. */
  comparable: boolean;
  /** Plain-English reasons the quotes cannot be compared directly. */
  reasons: string[];
  /** IDs of the cheapest quote(s). Empty unless comparable. Ties return all tied IDs. */
  cheapestIds: number[];
}

function gstBasis(t: GstTreatment): "taxable" | "gst_free" {
  return t === "gst_free" ? "gst_free" : "taxable";
}

export function analyseComparison(rfq: ComparisonRfq, quotes: ComparisonQuote[]): ComparisonResult {
  const reasons: string[] = [];

  if (quotes.length < 2) {
    return {
      comparable: false,
      reasons: quotes.length === 0 ? ["No quotations recorded yet."] : ["Only one quotation received."],
      cheapestIds: [],
    };
  }

  for (const q of quotes) {
    if (!q.scopeComplete) {
      reasons.push(`${q.supplierName}: quote does not cover the full RFQ scope.`);
    }
    if (q.unit !== rfq.unit) {
      reasons.push(`${q.supplierName}: quoted per ${unitLabel(q.unit)}, RFQ is per ${unitLabel(rfq.unit)}.`);
    }
    if (compareDecimal(q.quantity, rfq.quantity) !== 0) {
      reasons.push(`${q.supplierName}: quantity differs from the RFQ quantity.`);
    }
  }

  const bases = new Set(quotes.map((q) => gstBasis(q.gstTreatment)));
  if (bases.size > 1) {
    reasons.push("Quotes have a mix of GST-free and taxable pricing.");
  }

  if (reasons.length > 0) {
    return { comparable: false, reasons, cheapestIds: [] };
  }

  let lowest = quotes[0].totalExGst;
  for (const q of quotes) {
    if (compareDecimal(q.totalExGst, lowest) < 0) lowest = q.totalExGst;
  }
  const cheapestIds = quotes.filter((q) => compareDecimal(q.totalExGst, lowest) === 0).map((q) => q.id);

  return { comparable: true, reasons: [], cheapestIds };
}
