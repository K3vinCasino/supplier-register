import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RfqForm } from "@/components/rfq-form";
import { requireUser } from "@/lib/supabase/server";
import { getRfq, listProjectNames } from "@/lib/data/rfqs";
import { idSchema } from "@/lib/validation";
import { rfqCode } from "@/lib/format";
import { updateRfq } from "../../actions";

export const metadata: Metadata = { title: "Edit RFQ" };

export default async function EditRfqPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { supabase } = await requireUser();
  const [rfq, projectNames] = await Promise.all([getRfq(supabase, parsedId.data), listProjectNames(supabase)]);
  if (!rfq) notFound();

  return (
    <>
      <PageHeader title="Edit RFQ" subtitle={`${rfqCode(rfq.id)} · ${rfq.title}`} backHref={`/rfqs/${rfq.id}`} />
      <RfqForm
        action={updateRfq.bind(null, rfq.id)}
        rfq={rfq}
        projectNames={projectNames}
        cancelHref={`/rfqs/${rfq.id}`}
      />
    </>
  );
}
