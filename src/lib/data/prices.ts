import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { PriceHistoryRow } from "@/types/database";
import { toSearchWords } from "@/lib/search";

export interface PriceSearchFilters {
  q?: string;
  supplierId?: number;
  unit?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  limit?: number;
}

/**
 * Search historical quotations, newest first.
 * Every word typed must appear in the description, RFQ title/description,
 * supplier name or quote reference (so "20 mm aggregate" matches
 * "Supply 20mm aggregate, delivered").
 */
export async function searchPriceHistory(
  supabase: SupabaseServerClient,
  filters: PriceSearchFilters = {},
): Promise<PriceHistoryRow[]> {
  let query = supabase
    .from("price_history")
    .select("*")
    .order("date_received", { ascending: false })
    .order("quotation_id", { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 200));

  for (const word of toSearchWords(filters.q ?? "")) {
    query = query.ilike("search_text", `%${word}%`);
  }
  if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
  if (filters.unit) query = query.eq("unit", filters.unit);
  if (filters.from) query = query.gte("date_received", filters.from);
  if (filters.to) query = query.lte("date_received", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(`Could not search prices: ${error.message}`);
  return data;
}
