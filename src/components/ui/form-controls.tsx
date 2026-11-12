import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 " +
  "placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 " +
  "disabled:bg-slate-100 aria-invalid:border-red-500";

// text-base (16px) on inputs stops iPhones zooming in when a field is tapped.

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(controlBase, "py-3", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "h-12 appearance-auto pr-8", className)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string[] | undefined;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** A label + control + error message group. */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {hint && !error?.length && <p className="text-xs text-slate-500">{hint}</p>}
      {error?.map((e) => (
        <p key={e} id={`${htmlFor}-error`} className="text-sm text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}
