import type { ReactNode } from "react";
import type { RfqStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "slate", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<RfqStatus, BadgeTone> = {
  Draft: "slate",
  Sent: "blue",
  "Partially Quoted": "amber",
  Quoted: "purple",
  Awarded: "green",
  Closed: "slate",
};

export function StatusBadge({ status }: { status: RfqStatus }) {
  return <Badge tone={statusTones[status]}>{status}</Badge>;
}
