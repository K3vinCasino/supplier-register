import { z } from "zod";

/**
 * The shape every Server Action returns to its form.
 * - `message`: a general error shown at the top of the form
 * - `fieldErrors`: errors shown under individual fields
 * - `values`: what the user typed, so the form is not wiped after an error
 */
export interface FormState {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string | string[]>;
}

export const initialFormState: FormState = {};

/**
 * Convert FormData into a plain object for Zod.
 * Fields listed in `arrayKeys` (e.g. multi-select checkboxes) become arrays.
 * File inputs are ignored (not used in Version 1).
 */
export function formDataToObject(
  formData: FormData,
  arrayKeys: readonly string[] = [],
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of arrayKeys) result[key] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    if (arrayKeys.includes(key)) {
      (result[key] as string[]).push(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Build a FormState from a failed Zod parse. */
export function validationErrorState(error: z.ZodError, values: Record<string, string | string[]>): FormState {
  return {
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
    values,
  };
}

/** Turn a Supabase/Postgres error into a friendly message (never leak internals). */
export function databaseErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  switch (error.code) {
    case "23505":
      return "A record with these details already exists.";
    case "23001":
    case "23503":
      return "This record is linked to other records and cannot be changed this way.";
    case "23514":
      return "One of the values is outside the allowed range.";
    case "42501":
      return "You do not have permission to do that. Try logging in again.";
    case "P0002":
      return "Record not found.";
    default:
      return "Could not save to the database. Please try again.";
  }
}
