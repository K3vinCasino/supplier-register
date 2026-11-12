-- =============================================================================
-- SAMPLE DATA — for development / trying the app only.
--
-- NOT a migration. It is never run automatically. Run it manually in the
-- Supabase SQL Editor of a DEVELOPMENT project (or production, if you just
-- want to try things — then remove it with remove_sample_data.sql).
--
-- All sample records are marked with "[SAMPLE]" in their notes so they can be
-- found and deleted. Company names are fictional; prices are illustrative.
--
-- Records are owned by the FIRST user in auth.users, so create your login
-- user before running this.
-- =============================================================================

do $$
declare
  v_owner uuid;
  s_quarry bigint; s_quarry2 bigint; s_concrete bigint; s_pipes bigint; s_plant bigint; s_traffic bigint;
  r_agg bigint; r_rcp bigint; r_conc bigint; r_exc bigint;
begin
  select id into v_owner from auth.users order by created_at limit 1;
  if v_owner is null then
    raise exception 'Create a user in Supabase Authentication first.';
  end if;

  -- ---------------- suppliers ----------------
  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, website, service_area, materials_supplied, notes)
  values (v_owner, 'Ridgeline Quarries Pty Ltd', 'Dave Mitchell', '0412 555 101', 'sales@ridgeline.example.com.au', 'https://ridgeline.example.com.au',
          'Western Sydney, Hawkesbury', '20 mm aggregate, 10 mm aggregate, DGB20, road base, crusher dust, ballast', '[SAMPLE] Weighbridge open 6am. Min 10 t per load.')
  returning id into s_quarry;

  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, service_area, materials_supplied, notes)
  values (v_owner, 'Southern Cross Aggregates', 'Priya Nair', '(02) 4655 0123', 'quotes@sxagg.example.com.au',
          'Macarthur, Southern Highlands', '20 mm aggregate, DGB20, DGS40, select fill, bedding sand', '[SAMPLE]')
  returning id into s_quarry2;

  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, service_area, materials_supplied, notes)
  values (v_owner, 'Harbourside Premix Concrete', 'Tom Kowalski', '0400 555 202', 'orders@harbourside.example.com.au',
          'Greater Sydney', 'N25, N32, N40 premix, pump hire, kerb mix', '[SAMPLE] Saturday deliveries attract surcharge.')
  returning id into s_concrete;

  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, service_area, materials_supplied, notes)
  values (v_owner, 'Eastcoast Pipe & Precast', 'Sarah Lee', '1300 555 303', 'estimating@eastcoastpipe.example.com.au',
          'NSW wide', 'RCP Class 2/3/4, box culverts, pits, headwalls, HDPE pipe', '[SAMPLE]')
  returning id into s_pipes;

  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, service_area, materials_supplied, notes)
  values (v_owner, 'Titan Earthmoving Hire', 'Mick O''Brien', '0422 555 404', 'hire@titanhire.example.com.au',
          'Sydney, Central Coast', '5 t, 14 t, 20 t, 30 t excavators (wet/dry hire), rollers, water carts', '[SAMPLE] Wet hire rates include operator.')
  returning id into s_plant;

  insert into public.suppliers (owner_id, company_name, contact_name, phone, email, service_area, materials_supplied, notes)
  values (v_owner, 'SafeLane Traffic Management', 'Jess Turner', '0433 555 505', 'bookings@safelane.example.com.au',
          'Greater Sydney', 'TC crews, TGS design, VMS boards, arrow boards', '[SAMPLE]')
  returning id into s_traffic;

  insert into public.supplier_category_links (supplier_id, category_id)
  select s, c.id from (values
    (s_quarry, 'Quarry materials'), (s_quarry2, 'Quarry materials'),
    (s_concrete, 'Concrete'), (s_pipes, 'Drainage materials'),
    (s_plant, 'Plant hire'), (s_plant, 'Equipment hire'), (s_traffic, 'Traffic control')
  ) as v(s, name) join public.supplier_categories c on c.name = v.name;

  -- ---------------- RFQs ----------------
  insert into public.rfqs (owner_id, project_name, title, description, quantity, unit, date_requested, required_by, status, notes)
  values (v_owner, 'Elara Estate Stage 4 — Civil Works', '20 mm aggregate supply', 'Supply and deliver 20 mm crushed aggregate for pipe bedding/backfill. Deliver to Gate 2.', 120, 't', current_date - 40, current_date - 30, 'Quoted', '[SAMPLE]')
  returning id into r_agg;

  insert into public.rfqs (owner_id, project_name, title, description, quantity, unit, date_requested, required_by, status, notes)
  values (v_owner, 'Elara Estate Stage 4 — Civil Works', '375 RCP Class 3 stormwater pipe', 'Supply 375 mm RCP Class 3 rubber ring joint, 2.44 m lengths, delivered.', 96, 'lm', current_date - 20, current_date + 10, 'Partially Quoted', '[SAMPLE]')
  returning id into r_rcp;

  insert into public.rfqs (owner_id, project_name, title, description, quantity, unit, date_requested, required_by, status, notes)
  values (v_owner, 'Camden Valley Way Intersection Upgrade', 'N32 concrete — kerb and gutter', 'N32 20 mm premix for extruded kerb and gutter. Pours staged over 3 days.', 45, 'm3', current_date - 10, current_date + 14, 'Sent', '[SAMPLE]')
  returning id into r_conc;

  insert into public.rfqs (owner_id, project_name, title, description, quantity, unit, date_requested, required_by, status, notes)
  values (v_owner, 'Camden Valley Way Intersection Upgrade', '20 t excavator wet hire', '20 t excavator with operator for bulk excavation, est. 10 days.', 10, 'day', current_date - 5, current_date + 7, 'Draft', '[SAMPLE]')
  returning id into r_exc;

  -- ---------------- quotations ----------------
  -- Totals are calculated with the same rules as src/lib/money.ts.
  insert into public.quotations (
    owner_id, rfq_id, supplier_id, quote_reference, date_received, description, quantity, unit,
    unit_rate, delivery_cost, gst_treatment, unit_rate_ex_gst, total_ex_gst, gst_amount, total_inc_gst,
    lead_time, valid_until, scope_complete, notes, is_awarded)
  select v_owner, x.rfq, x.sup, x.ref, x.received, x.descr, x.qty, x.unit, x.rate, x.del, x.gst,
    case when x.gst = 'inclusive' then round(x.rate / 1.1, 4) else x.rate end,
    t.ex, t.g, t.ex + t.g,
    x.lead, x.valid, x.scope, '[SAMPLE] ' || coalesce(x.note, ''), x.awarded
  from (values
    (r_agg, s_quarry,  'RQ-24518', current_date - 38, '20 mm aggregate, delivered Gate 2', 120::numeric, 't',  42.50::numeric, 350.00::numeric, 'exclusive', '2 days',  current_date - 8, true,  null::text, true),
    (r_agg, s_quarry2, 'SX-1187',  current_date - 37, '20 mm crushed aggregate delivered', 120, 't',  39.80, 520.00, 'exclusive', '3 days',  current_date - 7, true,  'Truck and dog only', false),
    (r_rcp, s_pipes,   'EPP-5521', current_date - 15, '375 RCP Class 3 RRJ, delivered', 96, 'lm', 168.40, 0.00, 'exclusive', '2 weeks', current_date + 15, true,  'Delivery included', false),
    (r_conc, s_concrete,'HP-88213', current_date - 6, 'N32/20 premix, kerb mix', 45, 'm3', 286.00, 0.00, 'exclusive', 'Book 48 hrs ahead', current_date + 24, true, 'Short load fee under 3 m3', false),
    (r_exc, s_plant,   'TH-0912',  current_date - 2, '20 t excavator wet hire incl. operator', 10, 'day', 1980.00, 450.00, 'inclusive', '1 week', current_date + 28, true, 'Float in/out included in delivery', false)
  ) as x(rfq, sup, ref, received, descr, qty, unit, rate, del, gst, lead, valid, scope, note, awarded)
  cross join lateral (
    select
      case when x.gst = 'inclusive' then round(x.qty * x.rate + x.del, 2) - round(round(x.qty * x.rate + x.del, 2) / 11, 2)
           else round(x.qty * x.rate + x.del, 2) end as ex,
      case when x.gst = 'inclusive' then round(round(x.qty * x.rate + x.del, 2) / 11, 2)
           when x.gst = 'gst_free' then 0
           else round(round(x.qty * x.rate + x.del, 2) * 0.1, 2) end as g
  ) t;

  update public.rfqs set status = 'Awarded' where id = r_agg;

  raise notice 'Sample data loaded for user %', v_owner;
end $$;
