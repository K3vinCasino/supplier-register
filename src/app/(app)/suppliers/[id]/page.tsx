import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Globe, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { PriceHistoryList, ReferencePriceNotice } from "@/components/price-history-list";
import { requireUser } from "@/lib/supabase/server";
import { getSupplier } from "@/lib/data/suppliers";
import { searchPriceHistory } from "@/lib/data/prices";
import { idSchema } from "@/lib/validation";
import { formatDate, supplierCode, telHref } from "@/lib/format";
import { setSupplierArchived } from "../actions";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { supabase } = await requireUser();
  const [supplier, quotes] = await Promise.all([
    getSupplier(supabase, parsedId.data),
    searchPriceHistory(supabase, { supplierId: parsedId.data, limit: 50 }),
  ]);
  if (!supplier) notFound();

  const contactLink = "flex min-h-12 items-center gap-3 rounded-lg px-3 text-slate-800 hover:bg-slate-50 active:bg-slate-100";

  return (
    <>
      <PageHeader
        title={supplier.company_name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {supplierCode(supplier.id)} · Added {formatDate(supplier.created_at)}
            {supplier.is_archived && <Badge>Archived</Badge>}
          </span>
        }
        backHref="/suppliers"
        backLabel="Suppliers"
        actions={
          <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </LinkButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {supplier.contact_name && <p className="px-3 py-2 font-medium text-slate-900">{supplier.contact_name}</p>}
              {supplier.phone && (
                <a href={telHref(supplier.phone)} className={contactLink}>
                  <Phone className="h-5 w-5 text-amber-600" aria-hidden /> {supplier.phone}
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className={`${contactLink} break-all`}>
                  <Mail className="h-5 w-5 shrink-0 text-amber-600" aria-hidden /> {supplier.email}
                </a>
              )}
              {supplier.website && (
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className={`${contactLink} break-all`}>
                  <Globe className="h-5 w-5 shrink-0 text-amber-600" aria-hidden /> {supplier.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {supplier.service_area && (
                <p className="flex min-h-12 items-center gap-3 px-3 text-slate-700">
                  <MapPin className="h-5 w-5 shrink-0 text-slate-400" aria-hidden /> {supplier.service_area}
                </p>
              )}
              {!supplier.contact_name && !supplier.phone && !supplier.email && !supplier.website && (
                <p className="px-3 py-2 text-sm text-slate-500">No contact details recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-semibold text-slate-700">Categories</p>
                {supplier.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {supplier.categories.map((c) => (
                      <Link key={c.id} href={`/suppliers?category=${c.id}`}>
                        <Badge tone="amber">{c.name}</Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">None</p>
                )}
              </div>
              <div>
                <p className="mb-1 font-semibold text-slate-700">Materials / services</p>
                <p className="whitespace-pre-wrap text-slate-800">{supplier.materials_supplied ?? "—"}</p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-slate-700">Notes</p>
                <p className="whitespace-pre-wrap text-slate-800">{supplier.notes ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <form action={setSupplierArchived.bind(null, supplier.id, !supplier.is_archived)}>
            <SubmitButton variant={supplier.is_archived ? "secondary" : "danger"} className="w-full" pendingText="Updating…">
              {supplier.is_archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" aria-hidden /> Restore supplier
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" aria-hidden /> Archive supplier
                </>
              )}
            </SubmitButton>
            <p className="mt-2 text-center text-xs text-slate-500">
              Archived suppliers are hidden from lists but their quotations are kept.
            </p>
          </form>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Quotation history</h2>
          {quotes.length === 0 ? (
            <EmptyState title="No quotations from this supplier yet" />
          ) : (
            <>
              <ReferencePriceNotice />
              <PriceHistoryList rows={quotes} hideSupplier />
            </>
          )}
        </div>
      </div>
    </>
  );
}
