import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { PriceHistoryList, ReferencePriceNotice } from "@/components/price-history-list";
import { requireUser } from "@/lib/supabase/server";
import { searchPriceHistory } from "@/lib/data/prices";
import { listSupplierOptions } from "@/lib/data/suppliers";
import { idSchema } from "@/lib/validation";
import { UNITS, UNIT_VALUES, type Unit } from "@/lib/constants";

export const metadata: Metadata = { title: "Price search" };

type SearchParams = Promise<{ q?: string; supplier?: string; unit?: string; from?: string; to?: string }>;

const isDate = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isUnit = (v: string | undefined): v is Unit => !!v && (UNIT_VALUES as readonly string[]).includes(v);

const LIMIT = 100;

export default async function PricesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const supplierId = idSchema.safeParse(sp.supplier).data;
  const unit = isUnit(sp.unit) ? sp.unit : undefined;
  const from = isDate(sp.from) ? sp.from : undefined;
  const to = isDate(sp.to) ? sp.to : undefined;
  const filtered = Boolean(q || supplierId || unit || from || to);

  const { supabase } = await requireUser();
  const [rows, suppliers] = await Promise.all([
    searchPriceHistory(supabase, { q, supplierId, unit, from, to, limit: LIMIT }),
    listSupplierOptions(supabase),
  ]);

  return (
    <>
      <PageHeader title="Historical prices" subtitle="Search every quotation you have recorded, newest first." />

      <form className="mb-4 space-y-3" role="search">
        <div className="flex gap-2">
          <Input
            name="q"
            type="search"
            placeholder='e.g. "20 mm aggregate", "375 RCP", "excavator"'
            defaultValue={q}
            aria-label="Material or service"
            className="h-14 text-lg"
            autoFocus={!filtered}
          />
          <Button type="submit" size="lg" variant="dark">
            Search
          </Button>
        </div>
        <details className="rounded-lg border border-slate-200 bg-white" open={Boolean(supplierId || unit || from || to)}>
          <summary className="flex h-12 cursor-pointer items-center px-4 text-sm font-semibold text-slate-700">
            More filters
          </summary>
          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Supplier" htmlFor="supplier">
              <Select id="supplier" name="supplier" defaultValue={supplierId ? String(supplierId) : ""}>
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit" htmlFor="unit">
              <Select id="unit" name="unit" defaultValue={unit ?? ""}>
                <option value="">Any unit</option>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Received from" htmlFor="from">
              <Input id="from" name="from" type="date" defaultValue={from} />
            </Field>
            <Field label="Received to" htmlFor="to">
              <Input id="to" name="to" type="date" defaultValue={to} />
            </Field>
          </div>
        </details>
      </form>

      <div className="space-y-3">
        <ReferencePriceNotice />
        {rows.length === 0 ? (
          <EmptyState title={filtered ? "No matching quotations" : "No quotations recorded yet"}>
            {filtered ? (
              <>
                Try fewer or different words.{" "}
                <Link href="/prices" className="font-medium text-amber-700 underline">
                  Clear search
                </Link>
              </>
            ) : (
              "Quotations you record against RFQs will appear here."
            )}
          </EmptyState>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {rows.length === LIMIT ? `Showing the ${LIMIT} most recent matches. Refine your search to narrow down.` : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
            </p>
            <PriceHistoryList rows={rows} />
          </>
        )}
      </div>
    </>
  );
}
