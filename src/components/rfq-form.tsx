"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import { RFQ_STATUSES, UNITS } from "@/lib/constants";
import type { Rfq } from "@/types/database";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { fieldError, fieldValue } from "./form-values";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function RfqForm({
  action,
  rfq,
  defaults,
  projectNames,
  cancelHref,
}: {
  action: Action;
  rfq?: Rfq;
  defaults?: Partial<Record<keyof Rfq, string>>;
  projectNames: string[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const initial = { ...defaults, ...rfq };
  const v = (name: string) => fieldValue(state, initial, name);
  const e = (name: string) => fieldError(state, name);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state.message} />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Project name" htmlFor="project_name" required error={e("project_name")}>
            <Input
              id="project_name"
              name="project_name"
              list="project-names"
              required
              placeholder="e.g. Western Sydney Airport Access Rd"
              defaultValue={v("project_name")}
            />
            <datalist id="project-names">
              {projectNames.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="RFQ title" htmlFor="title" required error={e("title")}>
            <Input id="title" name="title" required placeholder="e.g. 20 mm aggregate supply" defaultValue={v("title")} />
          </Field>
          <Field
            label="Material or service description"
            htmlFor="description"
            required
            error={e("description")}
            className="md:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="Specification, standards (e.g. TfNSW R44), delivery location, staging…"
              defaultValue={v("description")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" htmlFor="quantity" required error={e("quantity")}>
              <Input id="quantity" name="quantity" inputMode="decimal" required defaultValue={v("quantity")} />
            </Field>
            <Field label="Unit" htmlFor="unit" required error={e("unit")}>
              <Select id="unit" name="unit" required defaultValue={v("unit") || "t"}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Status" htmlFor="status" required error={e("status")}>
            <Select id="status" name="status" defaultValue={v("status") || "Draft"}>
              {RFQ_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date requested" htmlFor="date_requested" required error={e("date_requested")}>
            <Input id="date_requested" name="date_requested" type="date" required defaultValue={v("date_requested")} />
          </Field>
          <Field label="Required delivery date" htmlFor="required_by" error={e("required_by")}>
            <Input id="required_by" name="required_by" type="date" defaultValue={v("required_by")} />
          </Field>
          <Field label="Notes" htmlFor="notes" error={e("notes")} className="md:col-span-2">
            <Textarea id="notes" name="notes" placeholder="Suppliers sent to, site contact, access constraints…" defaultValue={v("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
        <SubmitButton>{rfq ? "Save changes" : "Create RFQ"}</SubmitButton>
      </div>
    </form>
  );
}
