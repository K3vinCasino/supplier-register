import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { Supplier, SupplierCategory } from "@/types/database";
import { sanitizeSearchTerm } from "@/lib/search";

/**
 * Read-only database queries for suppliers. Each function receives the
 * per-request Supabase client, so Row Level Security limits results to the
 * logged-in user's records.
 */

export type SupplierWithCategories = Supplier & { categories: SupplierCategory[] };

const SUPPLIER_SELECT = "*, supplier_category_links(supplier_categories(id, name, sort_order))" as const;

type SupplierQueryRow = Supplier & {
  supplier_category_links: { supplier_categories: SupplierCategory | null }[];
};

function withCategories(row: SupplierQueryRow): SupplierWithCategories {
  const { supplier_category_links, ...supplier } = row;
  const categories = supplier_category_links
    .map((l) => l.supplier_categories)
    .filter((c): c is SupplierCategory => c !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
  return { ...supplier, categories };
}

export async function listCategories(supabase: SupabaseServerClient): Promise<SupplierCategory[]> {
  const { data, error } = await supabase.from("supplier_categories").select("*").order("sort_order");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return data;
}

export interface SupplierFilters {
  q?: string;
  categoryId?: number;
  status?: "active" | "archived" | "all";
}

export async function listSuppliers(
  supabase: SupabaseServerClient,
  filters: SupplierFilters = {},
): Promise<SupplierWithCategories[]> {
  let query = supabase.from("suppliers").select(SUPPLIER_SELECT).order("company_name").limit(500);

  const status = filters.status ?? "active";
  if (status === "active") query = query.eq("is_archived", false);
  if (status === "archived") query = query.eq("is_archived", true);

  const q = sanitizeSearchTerm(filters.q ?? "");
  if (q) {
    const p = `%${q}%`;
    query = query.or(
      `company_name.ilike.${p},contact_name.ilike.${p},materials_supplied.ilike.${p},service_area.ilike.${p},notes.ilike.${p}`,
    );
  }

  if (filters.categoryId) {
    // Two steps keeps every category on the returned suppliers (an inner
    // join filter would hide the supplier's other categories).
    const { data: links, error: linkError } = await supabase
      .from("supplier_category_links")
      .select("supplier_id")
      .eq("category_id", filters.categoryId);
    if (linkError) throw new Error(`Could not filter suppliers: ${linkError.message}`);
    const ids = links.map((l) => l.supplier_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load suppliers: ${error.message}`);
  return (data as SupplierQueryRow[]).map(withCategories);
}

export async function getSupplier(supabase: SupabaseServerClient, id: number): Promise<SupplierWithCategories | null> {
  const { data, error } = await supabase.from("suppliers").select(SUPPLIER_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load supplier: ${error.message}`);
  return data ? withCategories(data as SupplierQueryRow) : null;
}

/** Minimal list for dropdowns (active suppliers, plus optionally one specific supplier). */
export async function listSupplierOptions(
  supabase: SupabaseServerClient,
  includeId?: number,
): Promise<{ id: number; company_name: string }[]> {
  let query = supabase.from("suppliers").select("id, company_name").order("company_name").limit(1000);
  query = includeId ? query.or(`is_archived.eq.false,id.eq.${includeId}`) : query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load suppliers: ${error.message}`);
  return data;
}
