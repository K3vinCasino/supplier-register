/**
 * Helpers for turning what the user types into safe database search terms.
 */

/**
 * Remove characters that have special meaning in Supabase/PostgREST filter
 * strings (commas, brackets, wildcards, quotes, backslashes). This prevents a
 * search such as "pipe, 375" from breaking the query.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[,()*%\\"'`:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Split a search phrase into individual lower-case words. Every word must
 * appear somewhere in the record for it to match.
 *
 * Numbers are separated from letters so "20mm" and "20 mm" find the same
 * records: both become ["20", "mm"].
 *
 * Example: "20mm Aggregate" → ["20", "mm", "aggregate"]
 */
export function toSearchWords(input: string): string[] {
  const cleaned = sanitizeSearchTerm(input)
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2");

  const words = cleaned.split(" ").filter((w) => w.length > 0);
  return Array.from(new Set(words)).slice(0, 10);
}
