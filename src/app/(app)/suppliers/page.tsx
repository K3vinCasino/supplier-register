import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { LinkButton, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { listCategories, listSuppliers } from "@/lib/data/suppliers";
import { idSchema } from "@/lib/validation";
import { supplierCode, telHref } from "@/lib/format";

export const metadata: Metadata = { title: "Suppliers" };

type SearchParams = Promise<{ q?: string; category?: string; status?: string }>;

export default async function SuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categoryId = idSchema.safeParse(sp.category).data;
  const status = sp.status === "archived" || sp.status === "all" ? sp.status : "active";

  const { supabase } = await requireUser();
  const [categories, suppliers] = await Promise.all([
    listCategories(supabase),
    listSuppliers(supabase, { q, categoryId, status }),
  ]);
  const filtered = Boolean(q || categoryId || status !== "active");

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} ${status === "archived" ? "archived " : ""}supplier${suppliers.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href="/suppliers/new">
            <Plus className="h-5 w-5" aria-hidden /> Add supplier
          </LinkButton>
        }
      />

      {/* A plain GET form: filters live in the URL, so results can be bookmarked */}
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <Input
          name="q"
          type="search"
          placeholder="Search name, contact, materials…"
          defaultValue={q}
          aria-label="Search suppliers"
        />
        <Select name="category" defaultValue={categoryId ? String(categoryId) : ""} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
        <Button type="submit" variant="dark">
          Search
        </Button>
      </form>

      {suppliers.length === 0 ? (
        <EmptyState title={filtered ? "No suppliers match your search" : "No suppliers yet"}>
          {filtered ? (
            <Link href="/suppliers" className="font-medium text-amber-700 underline">
              Clear filters
            </Link>
          ) : (
            "Add your first supplier to start building the register."
          )}
        </EmptyState>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Card className="overflow-hidden">
                  <Link href={`/suppliers/${s.id}`} className="block p-4 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{s.company_name}</p>
                      {s.is_archived && <Badge>Archived</Badge>}
                    </div>
                    {s.contact_name && <p className="text-sm text-slate-600">{s.contact_name}</p>}
                    {s.service_area && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5" aria-hidden /> {s.service_area}
                      </p>
                    )}
                    {s.categories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.categories.map((c) => (
                          <Badge key={c.id} tone="amber">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                  {(s.phone || s.email) && (
                    <div className="grid grid-cols-2 border-t border-slate-100 text-sm font-medium">
                      {s.phone ? (
                        <a href={telHref(s.phone)} className="flex h-12 items-center justify-center gap-2 text-slate-700 active:bg-slate-50">
                          <Phone className="h-4 w-4" aria-hidden /> Call
                        </a>
                      ) : (
                        <span />
                      )}
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          className="flex h-12 items-center justify-center gap-2 border-l border-slate-100 text-slate-700 active:bg-slate-50"
                        >
                          <Mail className="h-4 w-4" aria-hidden /> Email
                        </a>
                      ) : (
                        <span />
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Categories</th>
                  <th className="px-4 py-3">Service area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/suppliers/${s.id}`} className="font-semibold text-slate-900 hover:text-amber-700">
                        {s.company_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {supplierCode(s.id)} {s.is_archived && "· Archived"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{s.contact_name ?? "—"}</div>
                      {s.phone && (
                        <a href={telHref(s.phone)} className="block text-slate-500 hover:text-amber-700">
                          {s.phone}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="block text-slate-500 hover:text-amber-700">
                          {s.email}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.categories.map((c) => (
                          <Badge key={c.id} tone="amber">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.service_area ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
