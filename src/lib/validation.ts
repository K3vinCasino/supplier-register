import { z } from "zod";
import { GST_TREATMENTS, RFQ_STATUSES, UNIT_VALUES } from "./constants";

/**
 * Zod schemas describing valid form input. These run on the SERVER inside
 * every Server Action — browser-side checks can be bypassed, server-side
 * checks cannot.
 *
 * Form fields always arrive as strings, so these schemas also convert
 * strings to the right shape (e.g. "" → null, "$1,250.50" → "1250.50").
 */

// ---------- building blocks ----------

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : null));

/** Strip "$", commas and spaces so "$1,250.50" is accepted. */
const cleanNumber = (v: unknown) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v);

const decimalString = (label: string, decimals: number, opts: { positive?: boolean } = {}) =>
  z.preprocess(
    cleanNumber,
    z
      .string({ error: `${label} is required` })
      .min(1, `${label} is required`)
      .regex(
        new RegExp(`^\\d{1,10}(\\.\\d{1,${decimals}})?$`),
        `${label} must be a number with up to ${decimals} decimal places`,
      )
      .refine((v) => !opts.positive || Number(v) > 0, `${label} must be greater than zero`),
  );

const optionalDecimalString = (label: string, decimals: number) =>
  z.preprocess(
    (v) => {
      const c = cleanNumber(v);
      return c === "" || c === undefined || c === null ? "0" : c;
    },
    z
      .string()
      .regex(
        new RegExp(`^\\d{1,10}(\\.\\d{1,${decimals}})?$`),
        `${label} must be a number with up to ${decimals} decimal places`,
      ),
  );

function isRealDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const requiredDate = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .min(1, `${label} is required`)
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && isRealDate(v), `${label} must be a valid date`);

const optionalDate = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && isRealDate(v)), `${label} must be a valid date`);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const idSchema = z.coerce.number().int().positive();

// ---------- login ----------

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(200),
});

// ---------- suppliers ----------

export const supplierSchema = z.object({
  company_name: requiredText("Company name", 200),
  contact_name: optionalText("Contact name", 120),
  phone: optionalText("Phone", 40).refine(
    (v) => v === null || /^[0-9+()\-\s]{6,40}$/.test(v),
    "Phone may only contain numbers, spaces, +, ( ) and -",
  ),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email address"),
  website: z
    .string()
    .trim()
    .max(300, "Website must be 300 characters or fewer")
    .optional()
    .transform((v) => {
      if (!v) return null;
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    })
    .refine((v) => {
      if (v === null) return true;
      try {
        const u = new URL(v);
        return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "Enter a valid website, e.g. www.example.com.au"),
  service_area: optionalText("Location / service area", 200),
  materials_supplied: optionalText("Materials or services", 2000),
  notes: optionalText("Notes", 5000),
  category_ids: z.array(z.coerce.number().int().positive()).max(20).default([]),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

// ---------- RFQs ----------

export const rfqSchema = z
  .object({
    project_name: requiredText("Project name", 200),
    title: requiredText("RFQ title", 200),
    description: requiredText("Description", 5000),
    quantity: decimalString("Quantity", 3, { positive: true }),
    unit: z.enum(UNIT_VALUES, { error: "Select a unit" }),
    date_requested: requiredDate("Date requested"),
    required_by: optionalDate("Required delivery date"),
    status: z.enum(RFQ_STATUSES, { error: "Select a status" }),
    notes: optionalText("Notes", 5000),
  })
  .refine((d) => d.required_by === null || d.required_by >= d.date_requested, {
    message: "Required date cannot be before the date requested",
    path: ["required_by"],
  });
export type RfqInput = z.infer<typeof rfqSchema>;

// ---------- quotations ----------

export const quotationSchema = z.object({
  rfq_id: idSchema,
  supplier_id: z.coerce.number({ error: "Select a supplier" }).int().positive("Select a supplier"),
  quote_reference: optionalText("Quote reference", 100),
  date_received: requiredDate("Date received"),
  description: requiredText("Description", 5000),
  quantity: decimalString("Quantity", 3, { positive: true }),
  unit: z.enum(UNIT_VALUES, { error: "Select a unit" }),
  unit_rate: decimalString("Unit rate", 4),
  delivery_cost: optionalDecimalString("Delivery cost", 2),
  gst_treatment: z.enum(GST_TREATMENTS, { error: "Select how GST applies" }),
  lead_time: optionalText("Lead time", 100),
  valid_until: optionalDate("Quote validity date"),
  scope_complete: checkbox,
  notes: optionalText("Notes", 5000),
});
export type QuotationInput = z.infer<typeof quotationSchema>;
