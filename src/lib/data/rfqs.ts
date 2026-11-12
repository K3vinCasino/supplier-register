import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { Quotation, Rfq } from "@/types/database";
import { AWAITING_RFQ_STATUSES, OPEN_RFQ_STATUSES, type RfqStatus } from "@/lib/constants";
import { sanitizeSearchTerm } from "@/lib/search";

export interface RfqFilters {
  q?: string;
  /** A specific status, "open" (not awarded/closed) or "awaiting" (Sent/Partially Quoted). */
  status?: RfqStatus | "open" | "awaiting";
  project?: string;
}

export type RfqListItem = Rfq & { quotation_count: number };

export async function listRfqs(supabase: SupabaseServerClient, filters: RfqFilters = {}): Promise<RfqListItem[]> {
  let query = supabase
    .from("rfqs")
    .select("*, quotations(count)")
    .order("date_requested", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);

  if (filters.status === "open") query = query.in("status", OPEN_RFQ_STATUSES);
  else if (filters.status === "awaiting") query = query.in("status", AWAITING_RFQ_STATUSES);
  else if (filters.status) query = query.eq("status", filters.status);

  if (filters.project) query = query.eq("project_name", filters.project);

  const q = sanitizeSearchTerm(filters.q ?? "");
  if (q) {
    const p = `%${q}%`;
    query = query.or(`title.ilike.${p},project_name.ilike.${p},description.ilike.${p}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load RFQs: ${error.message}`);

  return data.map(({ quotations, ...rfq }) => ({
    ...rfq,
    quotation_count: (quotations as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getRfq(supabase: SupabaseServerClient, id: number): Promise<Rfq | null> {
  const { data, error } = await supabase.from("rfqs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load RFQ: ${error.message}`);
  return data;
}

export type QuotationWithSupplier = Quotation & { supplier: { id: number; company_name: string; is_archived: boolean } };

export async function listQuotationsForRfq(
  supabase: SupabaseServerClient,
  rfqId: number,
): Promise<QuotationWithSupplier[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, supplier:suppliers(id, company_name, is_archived)")
    .eq("rfq_id", rfqId)
    .order("total_ex_gst", { ascending: true });
  if (error) throw new Error(`Could not load quotations: ${error.message}`);
  return data.filter((q): q is QuotationWithSupplier => q.supplier !== null);
}

export async function getQuotation(supabase: SupabaseServerClient, id: number): Promise<Quotation | null> {
  const { data, error } = await supabase.from("quotations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load quotation: ${error.message}`);
  return data;
}

/** Distinct project names, for the project filter and form suggestions. */
export async function listProjectNames(supabase: SupabaseServerClient): Promise<string[]> {
  const { data, error } = await supabase.from("rfqs").select("project_name").order("project_name").limit(1000);
  if (error) throw new Error(`Could not load projects: ${error.message}`);
  return Array.from(new Set(data.map((r) => r.project_name)));
}

export interface DashboardStats {
  totalSuppliers: number;
  totalRfqs: number;
  openRfqs: number;
  awaitingQuotes: number;
}

export async function getDashboardStats(supabase: SupabaseServerClient): Promise<DashboardStats> {
  // `head: true` asks only for the count, not the rows.
  const count = { count: "exact", head: true } as const;
  const [suppliers, rfqs, open, awaiting] = await Promise.all([
    supabase.from("suppliers").select("id", count).eq("is_archived", false),
    supabase.from("rfqs").select("id", count),
    supabase.from("rfqs").select("id", count).in("status", OPEN_RFQ_STATUSES),
    supabase.from("rfqs").select("id", count).in("status", AWAITING_RFQ_STATUSES),
  ]);
  for (const r of [suppliers, rfqs, open, awaiting]) {
    if (r.error) throw new Error(`Could not load dashboard: ${r.error.message}`);
  }
  return {
    totalSuppliers: suppliers.count ?? 0,
    totalRfqs: rfqs.count ?? 0,
    openRfqs: open.count ?? 0,
    awaitingQuotes: awaiting.count ?? 0,
  };
}
