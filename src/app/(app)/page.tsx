import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, HardHat, Inbox, Plus, Search, Timer } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/data/rfqs";
import { searchPriceHistory } from "@/lib/data/prices";
import { GST_SHORT_LABELS, unitLabel } from "@/lib/constants";
import { formatRate } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const [stats, recent] = await Promise.all([getDashboardStats(supabase), searchPriceHistory(supabase, { limit: 6 })]);

  const tiles = [
    { label: "Suppliers", value: stats.totalSuppliers, href: "/suppliers", icon: HardHat },
    { label: "Total RFQs", value: stats.totalRfqs, href: "/rfqs", icon: ClipboardList },
    { label: "Open RFQs", value: stats.openRfqs, href: "/rfqs?status=open", icon: Inbox },
    { label: "Awaiting quotes", value: stats.awaitingQuotes, href: "/rfqs?status=awaiting", icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Dashboard</h1>

      {/* Quick actions — big targets for use on site */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LinkButton href="/prices" size="lg" variant="dark" className="justify-start">
          <Search className="h-6 w-6" aria-hidden /> Search prices
        </LinkButton>
        <LinkButton href="/rfqs/new" size="lg" className="justify-start">
          <Plus className="h-6 w-6" aria-hidden /> Create RFQ
        </LinkButton>
        <LinkButton href="/suppliers/new" size="lg" variant="secondary" className="justify-start">
          <Plus className="h-6 w-6" aria-hidden /> Add supplier
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Card className="p-4 transition-colors hover:border-amber-300 active:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm font-medium">{label}</span>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        &ldquo;Awaiting quotes&rdquo; counts RFQs with status Sent or Partially Quoted.
      </p>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent quotations</CardTitle>
          <Link href="/prices" className="text-sm font-medium text-amber-700 hover:underline">
            View all
          </Link>
        </CardHeader>
        {recent.length === 0 ? (
          <CardContent className="text-sm text-slate-600">
            No quotations yet. Create an RFQ, then record supplier quotes against it.
          </CardContent>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.quotation_id}>
                <Link href={`/rfqs/${r.rfq_id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{r.description}</p>
                    <p className="truncate text-sm text-slate-500">
                      {r.supplier_name} · {formatDate(r.date_received)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-900">
                      {formatRate(r.unit_rate)}/{unitLabel(r.unit)}
                    </p>
                    <p className="text-xs text-slate-500">{GST_SHORT_LABELS[r.gst_treatment]}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
