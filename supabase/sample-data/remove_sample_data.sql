-- Removes everything created by load_sample_data.sql (records whose notes
-- start with "[SAMPLE]"). Your real records are not touched.
-- Run in the Supabase SQL Editor.

begin;

delete from public.quotations
where notes like '[SAMPLE]%'
   or rfq_id in (select id from public.rfqs where notes like '[SAMPLE]%');

delete from public.rfqs where notes like '[SAMPLE]%';

-- Only delete sample suppliers that no real quotation still references
delete from public.suppliers s
where s.notes like '[SAMPLE]%'
  and not exists (select 1 from public.quotations q where q.supplier_id = s.id);

commit;
