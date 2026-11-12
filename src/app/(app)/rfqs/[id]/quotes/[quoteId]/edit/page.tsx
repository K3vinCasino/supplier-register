import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { QuotationForm } from "@/components/quotation-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireUser } from "@/lib/supabase/server";
import { getQuotation, getRfq } from "@/lib/data/rfqs";
import { listSupplierOptions } from "@/lib/data/suppliers";
import { idSchema } from "@/lib/validation";
import { quoteCode, rfqCode } from "@/lib/format";
import { deleteQuotation, updateQuotation } from "../../../../actions";

export const metadata: Metadata = { title: "Edit quotation" };

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const raw = await params;
  const rfqId = idSchema.safeParse(raw.id);
  const quoteId = idSchema.safeParse(raw.quoteId);
  if (!rfqId.success || !quoteId.success) notFound();

  const { supabase } = await requireUser();
  const [rfq, quote] = await Promise.all([getRfq(supabase, rfqId.data), getQuotation(supabase, quoteId.data)]);
  if (!rfq || !quote || quote.rfq_id !== rfq.id) notFound();
  const suppliers = await listSupplierOptions(supabase, quote.supplier_id);

  return (
    <>
      <PageHeader
        title="Edit quotation"
        subtitle={`${quoteCode(quote.id)} · ${rfqCode(rfq.id)} ${rfq.title}`}
        backHref={`/rfqs/${rfq.id}`}
      />
      <QuotationForm
        action={updateQuotation.bind(null, quote.id)}
        suppliers={suppliers}
        rfqUnit={rfq.unit}
        cancelHref={`/rfqs/${rfq.id}`}
        isEdit
        initial={quote}
      />
      <form action={deleteQuotation.bind(null, quote.id, rfq.id)} className="mt-8 border-t border-slate-200 pt-6">
        <ConfirmSubmitButton
          variant="danger"
          className="w-full sm:w-auto"
          confirmMessage="Delete this quotation permanently? This cannot be undone."
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Delete quotation
        </ConfirmSubmitButton>
      </form>
    </>
  );
}
