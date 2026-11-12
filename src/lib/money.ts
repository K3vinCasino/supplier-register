import Decimal from "decimal.js";
import { GST_RATE, type GstTreatment } from "./constants";

/**
 * All money maths goes through this file.
 *
 * Why decimal.js? Ordinary JavaScript numbers are binary floating point,
 * so 0.1 + 0.2 === 0.30000000000000004. That is unacceptable for prices.
 * decimal.js does exact base-10 arithmetic. Values come in and go out as
 * strings so no precision is lost on the way to or from the database.
 *
 * Rounding rule: totals are rounded to whole cents, half away from zero
 * (the usual commercial rounding, e.g. $1.005 → $1.01).
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const ONE = new D(1);
const RATE = new D(GST_RATE);

export interface QuotationInputs {
  /** Quantity as a decimal string, e.g. "120" or "35.5". */
  quantity: string;
  /** Unit rate as entered on the quote, e.g. "42.50". */
  unitRate: string;
  /** Delivery/cartage cost as entered on the quote (same GST basis). */
  deliveryCost: string;
  /** How GST applies to the entered figures. */
  gstTreatment: GstTreatment;
}

export interface QuotationTotals {
  /** quantity × unit rate, rounded to cents (as entered GST basis). */
  lineTotal: string;
  /** Unit rate converted to ex-GST, 4 decimal places. */
  unitRateExGst: string;
  /** Total excluding GST (incl. delivery), 2 decimal places. */
  totalExGst: string;
  /** GST component, 2 decimal places. */
  gstAmount: string;
  /** Total including GST (incl. delivery), 2 decimal places. */
  totalIncGst: string;
}

function toDecimal(value: string, field: string): Decimal {
  const trimmed = value.trim();
  if (trimmed === "") return new D(0);
  let d: Decimal;
  try {
    d = new D(trimmed);
  } catch {
    throw new Error(`${field} is not a valid number`);
  }
  if (!d.isFinite()) throw new Error(`${field} is not a valid number`);
  if (d.isNegative()) throw new Error(`${field} cannot be negative`);
  return d;
}

/**
 * Calculate quotation totals.
 *
 * - exclusive: entered prices exclude GST → GST = 10% of the ex-GST total.
 * - inclusive: entered prices include GST → GST = 1/11 of the inc-GST total.
 * - gst_free:  no GST applies → ex-GST total equals inc-GST total.
 *
 * Totals always satisfy totalIncGst = totalExGst + gstAmount exactly
 * (the database enforces this too).
 */
export function calculateQuotationTotals(input: QuotationInputs): QuotationTotals {
  const quantity = toDecimal(input.quantity, "Quantity");
  const unitRate = toDecimal(input.unitRate, "Unit rate");
  const delivery = toDecimal(input.deliveryCost, "Delivery cost");

  const rawTotal = quantity.times(unitRate).plus(delivery);
  const lineTotal = quantity.times(unitRate).toDecimalPlaces(2);

  let totalExGst: Decimal;
  let gstAmount: Decimal;
  let totalIncGst: Decimal;
  let unitRateExGst: Decimal;

  switch (input.gstTreatment) {
    case "exclusive": {
      totalExGst = rawTotal.toDecimalPlaces(2);
      gstAmount = totalExGst.times(RATE).toDecimalPlaces(2);
      totalIncGst = totalExGst.plus(gstAmount);
      unitRateExGst = unitRate;
      break;
    }
    case "inclusive": {
      totalIncGst = rawTotal.toDecimalPlaces(2);
      // GST included in a price = price × rate / (1 + rate) = price / 11
      gstAmount = totalIncGst.times(RATE).dividedBy(ONE.plus(RATE)).toDecimalPlaces(2);
      totalExGst = totalIncGst.minus(gstAmount);
      unitRateExGst = unitRate.dividedBy(ONE.plus(RATE));
      break;
    }
    case "gst_free": {
      totalExGst = rawTotal.toDecimalPlaces(2);
      gstAmount = new D(0);
      totalIncGst = totalExGst;
      unitRateExGst = unitRate;
      break;
    }
    default: {
      const never: never = input.gstTreatment;
      throw new Error(`Unknown GST treatment: ${String(never)}`);
    }
  }

  return {
    lineTotal: lineTotal.toFixed(2),
    unitRateExGst: unitRateExGst.toDecimalPlaces(4).toFixed(4),
    totalExGst: totalExGst.toFixed(2),
    gstAmount: gstAmount.toFixed(2),
    totalIncGst: totalIncGst.toFixed(2),
  };
}

/** Safely try a calculation for live previews in forms (never throws). */
export function tryCalculateQuotationTotals(input: QuotationInputs): QuotationTotals | null {
  try {
    return calculateQuotationTotals(input);
  } catch {
    return null;
  }
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const audRateFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Format a money value (string or number from the database) as AUD, e.g. "$1,234.50". */
export function formatAUD(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return audFormatter.format(new D(String(value)).toNumber());
}

/** Format a unit rate, keeping up to 4 decimal places, e.g. "$42.5" → "$42.50", "$0.1234". */
export function formatRate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return audRateFormatter.format(new D(String(value)).toNumber());
}

/** Format a quantity without trailing zeros, e.g. "120.000" → "120". */
export function formatQuantity(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = new D(String(value));
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 3 }).format(d.toNumber());
}

/** Compare two decimal values exactly. Returns -1, 0 or 1. */
export function compareDecimal(a: string | number, b: string | number): number {
  return new D(String(a)).comparedTo(new D(String(b)));
}
