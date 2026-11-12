"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { initialFormState } from "@/lib/forms";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state.message} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={typeof state.values?.email === "string" ? state.values.email : ""}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingText="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
