import type { FormState } from "@/lib/forms";

/**
 * Pick the value to show in a form field: what the user just typed (if the
 * last save failed), otherwise the saved record's value.
 */
export function fieldValue(state: FormState, initial: object, name: string): string {
  if (state.values) {
    const v = state.values[name];
    return typeof v === "string" ? v : "";
  }
  const v = (initial as Record<string, unknown>)[name];
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

export function fieldError(state: FormState, name: string): string[] | undefined {
  return state.fieldErrors?.[name];
}
