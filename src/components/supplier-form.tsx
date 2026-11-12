"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import type { SupplierCategory } from "@/types/database";
import type { SupplierWithCategories } from "@/lib/data/suppliers";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form-controls";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { fieldError, fieldValue } from "./form-values";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function SupplierForm({
  action,
  categories,
  supplier,
  cancelHref,
}: {
  action: Action;
  categories: SupplierCategory[];
  supplier?: SupplierWithCategories;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const initial = { ...supplier };
  const v = (name: string) => fieldValue(state, initial, name);
  const e = (name: string) => fieldError(state, name);

  const selectedCategoryIds = new Set<string>(
    state.values
      ? (Array.isArray(state.values.category_ids) ? state.values.category_ids : [])
      : (supplier?.categories ?? []).map((c) => String(c.id)),
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state.message} />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Company name" htmlFor="company_name" required error={e("company_name")} className="md:col-span-2">
            <Input id="company_name" name="company_name" required maxLength={200} defaultValue={v("company_name")} />
          </Field>
          <Field label="Primary contact" htmlFor="contact_name" error={e("contact_name")}>
            <Input id="contact_name" name="contact_name" autoComplete="name" defaultValue={v("contact_name")} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={e("phone")}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="e.g. 0412 345 678" defaultValue={v("phone")} />
          </Field>
          <Field label="Email" htmlFor="email" error={e("email")}>
            <Input id="email" name="email" type="email" inputMode="email" placeholder="quotes@supplier.com.au" defaultValue={v("email")} />
          </Field>
          <Field label="Website" htmlFor="website" error={e("website")}>
            <Input id="website" name="website" inputMode="url" placeholder="www.supplier.com.au" defaultValue={v("website")} />
          </Field>
          <Field label="Location / service area" htmlFor="service_area" error={e("service_area")} className="md:col-span-2">
            <Input id="service_area" name="service_area" placeholder="e.g. Western Sydney, Blue Mountains" defaultValue={v("service_area")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-700">Categories</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-checked:border-amber-400 has-checked:bg-amber-50"
                >
                  <input
                    type="checkbox"
                    name="category_ids"
                    value={c.id}
                    defaultChecked={selectedCategoryIds.has(String(c.id))}
                    className="h-5 w-5 accent-amber-500"
                  />
                  <span className="text-sm text-slate-800">{c.name}</span>
                </label>
              ))}
            </div>
            {e("category_ids")?.map((m) => <p key={m} className="mt-1 text-sm text-red-600">{m}</p>)}
          </fieldset>
          <Field label="Materials or services supplied" htmlFor="materials_supplied" error={e("materials_supplied")}>
            <Textarea
              id="materials_supplied"
              name="materials_supplied"
              placeholder="e.g. 20 mm aggregate, DGB20, road base, crusher dust"
              defaultValue={v("materials_supplied")}
            />
          </Field>
          <Field label="Notes" htmlFor="notes" error={e("notes")}>
            <Textarea id="notes" name="notes" rows={4} defaultValue={v("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
        <SubmitButton>{supplier ? "Save changes" : "Add supplier"}</SubmitButton>
      </div>
    </form>
  );
}
