import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/supplier-form";
import { requireUser } from "@/lib/supabase/server";
import { getSupplier, listCategories } from "@/lib/data/suppliers";
import { idSchema } from "@/lib/validation";
import { updateSupplier } from "../../actions";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { supabase } = await requireUser();
  const [supplier, categories] = await Promise.all([getSupplier(supabase, parsedId.data), listCategories(supabase)]);
  if (!supplier) notFound();

  return (
    <>
      <PageHeader title="Edit supplier" subtitle={supplier.company_name} backHref={`/suppliers/${supplier.id}`} />
      <SupplierForm
        action={updateSupplier.bind(null, supplier.id)}
        categories={categories}
        supplier={supplier}
        cancelHref={`/suppliers/${supplier.id}`}
      />
    </>
  );
}
