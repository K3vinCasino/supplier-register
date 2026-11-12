import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/supplier-form";
import { requireUser } from "@/lib/supabase/server";
import { listCategories } from "@/lib/data/suppliers";
import { createSupplier } from "../actions";

export const metadata: Metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  const { supabase } = await requireUser();
  const categories = await listCategories(supabase);

  return (
    <>
      <PageHeader title="Add supplier" backHref="/suppliers" backLabel="Suppliers" />
      <SupplierForm action={createSupplier} categories={categories} cancelHref="/suppliers" />
    </>
  );
}
