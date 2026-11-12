/** Display helpers for IDs and dates. */

export const supplierCode = (id: number) => `SUP-${String(id).padStart(4, "0")}`;
export const rfqCode = (id: number) => `RFQ-${String(id).padStart(4, "0")}`;
export const quoteCode = (id: number) => `QUO-${String(id).padStart(4, "0")}`;

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Format a date-only string ("2026-11-11") as "11 Nov 2026".
 * Date-only values are treated as UTC so they never shift by a day.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

/** Today's date in Australia (Sydney time) as YYYY-MM-DD, for form defaults. */
export function todayISO(timeZone = "Australia/Sydney"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

/** Build a `tel:` link from a phone number (keeps digits and a leading +). */
export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
