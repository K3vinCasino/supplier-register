import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants = {
  primary: "bg-amber-400 text-slate-950 hover:bg-amber-300 active:bg-amber-500",
  secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  dark: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
  ghost: "text-slate-700 hover:bg-slate-100",
} as const;

const sizes = {
  md: "h-12 px-5 text-base", // 48px — comfortable touch target
  sm: "h-10 px-3 text-sm",
  lg: "h-14 px-6 text-lg",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
