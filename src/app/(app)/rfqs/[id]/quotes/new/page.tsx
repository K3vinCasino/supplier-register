import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { QuotationForm } from "@/components/quotation-form";
import { requireUser } from "@/lib/supabase/server";
import { getRfq } from "@/lib/data/rfqs";
import { listSupplierOptions } from "@/lib/data/suppliers";
import { idSchema } from "@/lib/validation";
import { rfqCode, todayISO } from "@/lib/format";
import { createQuotation } from "../../../actions";

export const metadata: Metadata = { title: "Add quotation" };

export default async function NewQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { supabase } = await requireUser();
  const [rfq, suppliers] = await Promise.all([getRfq(supabase, parsedId.data), listSupplierOptions(supabase)]);
  if (!rfq) notFound();

  return (
    <>
      <PageHeader title="Add quotation" subtitle={`${rfqCode(rfq.id)} · ${rfq.title}`} backHref={`/rfqs/${rfq.id}`} />
      <QuotationForm
        action={createQuotation}
        suppliers={suppliers}
        rfqUnit={rfq.unit}
        cancelHref={`/rfqs/${rfq.id}`}
        isEdit={false}
        initial={{
          // Pre-fill from the RFQ so most quotes only need a supplier and a rate
          rfq_id: rfq.id,
          date_received: todayISO(),
          description: rfq.title,
          quantity: rfq.quantity,
          unit: rfq.unit,
          gst_treatment: "exclusive",
          scope_complete: true,
        }}
      />
    </>
  );
}
