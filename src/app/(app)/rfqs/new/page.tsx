import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RfqForm } from "@/components/rfq-form";
import { requireUser } from "@/lib/supabase/server";
import { listProjectNames } from "@/lib/data/rfqs";
import { todayISO } from "@/lib/format";
import { createRfq } from "../actions";

export const metadata: Metadata = { title: "Create RFQ" };

export default async function NewRfqPage() {
  const { supabase } = await requireUser();
  const projectNames = await listProjectNames(supabase);

  return (
    <>
      <PageHeader title="Create RFQ" backHref="/rfqs" backLabel="RFQs" />
      <RfqForm
        action={createRfq}
        projectNames={projectNames}
        defaults={{ date_requested: todayISO(), status: "Draft", unit: "t" }}
        cancelHref="/rfqs"
      />
    </>
  );
}
