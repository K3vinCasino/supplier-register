"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { idSchema, supplierSchema } from "@/lib/validation";
import { databaseErrorMessage, formDataToObject, validationErrorState, type FormState } from "@/lib/forms";

/*
 * Server Actions for suppliers. "use server" means these functions only ever
 * run on the server — the browser just sends the form data.
 * Every action: 1) checks login, 2) validates input, 3) writes to the database.
 */

export async function createSupplier(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const values = formDataToObject(formData, ["category_ids"]);
  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  const { category_ids, ...supplier } = parsed.data;
  const { data, error } = await supabase.from("suppliers").insert(supplier).select("id").single();
  if (error) {
    return {
      message: error.code === "23505" ? "A supplier with this company name already exists." : databaseErrorMessage(error),
      values,
    };
  }

  const { error: catError } = await supabase.rpc("set_supplier_categories", {
    p_supplier_id: data.id,
    p_category_ids: category_ids,
  });
  if (catError) {
    return { message: `Supplier saved, but categories could not be saved. ${databaseErrorMessage(catError)}`, values };
  }

  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}`);
}

export async function updateSupplier(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const supplierId = idSchema.parse(id);
  const values = formDataToObject(formData, ["category_ids"]);
  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) return validationErrorState(parsed.error, values);

  const { category_ids, ...supplier } = parsed.data;
  const { error } = await supabase.from("suppliers").update(supplier).eq("id", supplierId);
  if (error) {
    return {
      message: error.code === "23505" ? "A supplier with this company name already exists." : databaseErrorMessage(error),
      values,
    };
  }

  const { error: catError } = await supabase.rpc("set_supplier_categories", {
    p_supplier_id: supplierId,
    p_category_ids: category_ids,
  });
  if (catError) return { message: databaseErrorMessage(catError), values };

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  redirect(`/suppliers/${supplierId}`);
}

export async function setSupplierArchived(id: number, archived: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const supplierId = idSchema.parse(id);
  const { error } = await supabase.from("suppliers").update({ is_archived: archived }).eq("id", supplierId);
  if (error) throw new Error(databaseErrorMessage(error));
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
}
