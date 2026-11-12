"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** A submit button that asks "Are you sure?" before submitting its form. */
export function ConfirmSubmitButton({
  children,
  confirmMessage,
  variant = "secondary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  confirmMessage: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}
