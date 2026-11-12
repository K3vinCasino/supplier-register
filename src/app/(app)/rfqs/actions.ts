"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { idSchema, quotationSchema, rfqSchema, type QuotationInput } from "@/lib/validation";
import { calculateQuotationTotals } from "@/lib/money";
import { databaseErrorMessage, formDataToObject, validationErrorState, type FormState } from "@/lib/forms";

// ============================================================================
// RFQs
// ============================================================================

export async function createRfq(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const values = formDataToObject(formData);
  const parsed = rfqSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  const { data, error } = await supabase.from("rfqs").insert(parsed.data).select("id").single();
  if (error) return { message: databaseErrorMessage(error), values };

  revalidatePath("/rfqs");
  redirect(`/rfqs/${data.id}`);
}

export async function updateRfq(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const rfqId = idSchema.parse(id);
  const values = formDataToObject(formData);
  const parsed = rfqSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  const { error } = await supabase.from("rfqs").update(parsed.data).eq("id", rfqId);
  if (error) return { message: databaseErrorMessage(error), values };

  revalidatePath("/rfqs");
  revalidatePath(`/rfqs/${rfqId}`);
  redirect(`/rfqs/${rfqId}`);
}

// ============================================================================
// Quotations
// ============================================================================

/** Combine validated input with server-calculated totals. */
function quotationRecord(input: QuotationInput) {
  const totals = calculateQuotationTotals({
    quantity: input.quantity,
    unitRate: input.unit_rate,
    deliveryCost: input.delivery_cost,
    gstTreatment: input.gst_treatment,
  });
  return {
    ...input,
    unit_rate_ex_gst: totals.unitRateExGst,
    total_ex_gst: totals.totalExGst,
    gst_amount: totals.gstAmount,
    total_inc_gst: totals.totalIncGst,
  };
}

export async function createQuotation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const values = formDataToObject(formData);
  const parsed = quotationSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  const record = quotationRecord(parsed.data);
  const { error } = await supabase.from("quotations").insert(record);
  if (error) return { message: databaseErrorMessage(error), values };

  // Receiving a quote moves a Draft/Sent RFQ to "Partially Quoted".
  // You can change the status manually at any time.
  await supabase
    .from("rfqs")
    .update({ status: "Partially Quoted" })
    .eq("id", record.rfq_id)
    .in("status", ["Draft", "Sent"]);

  revalidatePath(`/rfqs/${record.rfq_id}`);
  revalidatePath("/prices");
  redirect(`/rfqs/${record.rfq_id}`);
}

export async function updateQuotation(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const quotationId = idSchema.parse(id);
  const values = formDataToObject(formData);
  const parsed = quotationSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  // rfq_id is not changeable after creation; strip it from the update.
  const { rfq_id, ...update } = quotationRecord(parsed.data);
  const { error } = await supabase.from("quotations").update(update).eq("id", quotationId).eq("rfq_id", rfq_id);
  if (error) return { message: databaseErrorMessage(error), values };

  revalidatePath(`/rfqs/${rfq_id}`);
  revalidatePath("/prices");
  redirect(`/rfqs/${rfq_id}`);
}

export async function deleteQuotation(id: number, rfqId: number): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quotations").delete().eq("id", idSchema.parse(id));
  if (error) throw new Error(databaseErrorMessage(error));
  revalidatePath(`/rfqs/${rfqId}`);
  redirect(`/rfqs/${idSchema.parse(rfqId)}`);
}

/** User-initiated: mark this quotation as the successful supplier. */
export async function awardQuotation(id: number, rfqId: number): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("award_quotation", { p_quotation_id: idSchema.parse(id) });
  if (error) throw new Error(databaseErrorMessage(error));
  revalidatePath(`/rfqs/${rfqId}`);
  revalidatePath("/rfqs");
}

export async function clearAward(rfqId: number): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("clear_award", { p_rfq_id: idSchema.parse(rfqId) });
  if (error) throw new Error(databaseErrorMessage(error));
  revalidatePath(`/rfqs/${rfqId}`);
  revalidatePath("/rfqs");
}
