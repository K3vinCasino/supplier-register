// Shared lists used by forms, validation and display.
// If you change RFQ_STATUSES or GST_TREATMENTS, update the CHECK constraints
// in the database migration too.

export const RFQ_STATUSES = [
  "Draft",
  "Sent",
  "Partially Quoted",
  "Quoted",
  "Awarded",
  "Closed",
] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

/** RFQs that are still "live" (not yet awarded or closed). */
export const OPEN_RFQ_STATUSES: readonly RfqStatus[] = ["Draft", "Sent", "Partially Quoted", "Quoted"];
/** RFQs sent to suppliers where we are still waiting on prices. */
export const AWAITING_RFQ_STATUSES: readonly RfqStatus[] = ["Sent", "Partially Quoted"];

export const GST_TREATMENTS = ["exclusive", "inclusive", "gst_free"] as const;
export type GstTreatment = (typeof GST_TREATMENTS)[number];

export const GST_LABELS: Record<GstTreatment, string> = {
  exclusive: "Prices exclude GST",
  inclusive: "Prices include GST",
  gst_free: "GST-free",
};

export const GST_SHORT_LABELS: Record<GstTreatment, string> = {
  exclusive: "ex GST",
  inclusive: "inc GST",
  gst_free: "GST-free",
};

/** Australian GST rate (10%). */
export const GST_RATE = "0.10";

/** Units of measurement common in Australian civil construction. */
export const UNITS = [
  { value: "t", label: "t (tonne)" },
  { value: "m3", label: "m³ (cubic metre)" },
  { value: "m2", label: "m² (square metre)" },
  { value: "lm", label: "lm (linear metre)" },
  { value: "ea", label: "ea (each)" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L (litre)" },
  { value: "load", label: "load" },
  { value: "hr", label: "hr (hour)" },
  { value: "day", label: "day" },
  { value: "wk", label: "wk (week)" },
  { value: "month", label: "month" },
  { value: "LS", label: "LS (lump sum)" },
] as const;
export type Unit = (typeof UNITS)[number]["value"];
export const UNIT_VALUES = UNITS.map((u) => u.value) as [Unit, ...Unit[]];

export function unitLabel(value: string): string {
  const map: Record<string, string> = { m3: "m³", m2: "m²" };
  return map[value] ?? value;
}
