"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import { GST_LABELS, GST_TREATMENTS, UNITS, type GstTreatment } from "@/lib/constants";
import { formatAUD, tryCalculateQuotationTotals } from "@/lib/money";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { fieldError, fieldValue } from "./form-values";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface QuotationFormInitial {
  rfq_id: number;
  supplier_id?: number;
  quote_reference?: string | null;
  date_received: string;
  description: string;
  quantity: string | number;
  unit: string;
  unit_rate?: string | number;
  delivery_cost?: string | number;
  gst_treatment: GstTreatment;
  lead_time?: string | null;
  valid_until?: string | null;
  scope_complete: boolean;
  notes?: string | null;
}

const isGst = (v: string): v is GstTreatment => (GST_TREATMENTS as readonly string[]).includes(v);

export function QuotationForm({
  action,
  initial,
  suppliers,
  rfqUnit,
  cancelHref,
  isEdit,
}: {
  action: Action;
  initial: QuotationFormInitial;
  suppliers: { id: number; company_name: string }[];
  rfqUnit: string;
  cancelHref: string;
  isEdit: boolean;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: string) => fieldValue(state, initial, name);
  const e = (name: string) => fieldError(state, name);

  // These four fields drive the live total, so React tracks them as state.
  const [quantity, setQuantity] = useState(v("quantity"));
  const [unitRate, setUnitRate] = useState(v("unit_rate"));
  const [deliveryCost, setDeliveryCost] = useState(v("delivery_cost"));
  const [gst, setGst] = useState<GstTreatment>(() => {
    const g = v("gst_treatment");
    return isGst(g) ? g : "exclusive";
  });
  const [unit, setUnit] = useState(v("unit"));

  const clean = (s: string) => s.replace(/[$,\s]/g, "");
  const totals = tryCalculateQuotationTotals({
    quantity: clean(quantity),
    unitRate: clean(unitRate),
    deliveryCost: clean(deliveryCost),
    gstTreatment: gst,
  });

  const scopeDefault = state.values ? state.values.scope_complete === "on" : initial.scope_complete;

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state.message} />
      <input type="hidden" name="rfq_id" value={initial.rfq_id} />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier" htmlFor="supplier_id" required error={e("supplier_id")}>
            <Select id="supplier_id" name="supplier_id" required defaultValue={v("supplier_id")}>
              <option value="" disabled>
                Select a supplier…
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </Select>
            <Link href="/suppliers/new" className="inline-block py-1 text-sm font-medium text-amber-700 underline">
              Supplier not listed? Add a supplier
            </Link>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quote reference" htmlFor="quote_reference" error={e("quote_reference")}>
              <Input id="quote_reference" name="quote_reference" placeholder="e.g. Q-24518" defaultValue={v("quote_reference")} />
            </Field>
            <Field label="Date received" htmlFor="date_received" required error={e("date_received")}>
              <Input id="date_received" name="date_received" type="date" required defaultValue={v("date_received")} />
            </Field>
          </div>
          <Field label="Material or service description" htmlFor="description" required error={e("description")} className="md:col-span-2">
            <Textarea id="description" name="description" required defaultValue={v("description")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing (AUD)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" htmlFor="quantity" required error={e("quantity")}>
              <Input
                id="quantity"
                name="quantity"
                inputMode="decimal"
                required
                value={quantity}
                onChange={(ev) => setQuantity(ev.target.value)}
              />
            </Field>
            <Field label="Unit" htmlFor="unit" required error={e("unit")}>
              <Select id="unit" name="unit" required value={unit} onChange={(ev) => setUnit(ev.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit rate ($)" htmlFor="unit_rate" required error={e("unit_rate")}>
              <Input
                id="unit_rate"
                name="unit_rate"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={unitRate}
                onChange={(ev) => setUnitRate(ev.target.value)}
              />
            </Field>
            <Field label="Delivery cost ($)" htmlFor="delivery_cost" error={e("delivery_cost")}>
              <Input
                id="delivery_cost"
                name="delivery_cost"
                inputMode="decimal"
                placeholder="0.00"
                value={deliveryCost}
                onChange={(ev) => setDeliveryCost(ev.target.value)}
              />
            </Field>
          </div>
          <Field
            label="GST treatment"
            htmlFor="gst_treatment"
            required
            error={e("gst_treatment")}
            hint="Applies to both the unit rate and delivery cost as written on the quote."
            className="md:col-span-2"
          >
            <Select
              id="gst_treatment"
              name="gst_treatment"
              value={gst}
              onChange={(ev) => isGst(ev.target.value) && setGst(ev.target.value)}
            >
              {GST_TREATMENTS.map((g) => (
                <option key={g} value={g}>
                  {GST_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>

          {unit !== rfqUnit && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2">
              Note: this unit differs from the RFQ unit, so this quote won&apos;t be ranked as cheapest automatically.
            </p>
          )}

          {/* Live totals preview — the server recalculates on save */}
          <div className="rounded-lg bg-slate-900 p-4 text-white md:col-span-2" aria-live="polite">
            {totals ? (
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Ex GST</dt>
                  <dd className="text-lg font-bold">{formatAUD(totals.totalExGst)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">GST</dt>
                  <dd className="text-lg font-bold">{formatAUD(totals.gstAmount)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-amber-300">Inc GST</dt>
                  <dd className="text-lg font-bold text-amber-300">{formatAUD(totals.totalIncGst)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-center text-sm text-slate-300">Enter a quantity and unit rate to see the total.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Lead time" htmlFor="lead_time" error={e("lead_time")}>
            <Input id="lead_time" name="lead_time" placeholder="e.g. 2 days, ex stock, 3 weeks" defaultValue={v("lead_time")} />
          </Field>
          <Field label="Quote valid until" htmlFor="valid_until" error={e("valid_until")}>
            <Input id="valid_until" name="valid_until" type="date" defaultValue={v("valid_until")} />
          </Field>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 md:col-span-2">
            <input
              type="checkbox"
              name="scope_complete"
              defaultChecked={scopeDefault}
              className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
            />
            <span className="text-sm">
              <span className="font-semibold text-slate-800">Quote covers the full RFQ scope</span>
              <span className="block text-slate-500">
                Untick if the supplier excluded items, quoted partial quantity or added conditions.
              </span>
            </span>
          </label>
          <Field label="Notes" htmlFor="notes" error={e("notes")} className="md:col-span-2">
            <Textarea id="notes" name="notes" placeholder="Exclusions, minimum order, conditions…" defaultValue={v("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
        <SubmitButton>{isEdit ? "Save changes" : "Save quotation"}</SubmitButton>
      </div>
    </form>
  );
}
