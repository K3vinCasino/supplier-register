-- =============================================================================
-- Supplier Register — initial schema (Version 1)
--
-- How security works:
--   * Every business record has an `owner_id` column that defaults to the
--     logged-in user's id (auth.uid()).
--   * Row Level Security (RLS) is enabled on every table. Policies only allow
--     a logged-in user to see or change rows they own.
--   * Anonymous (not logged in) visitors get no access at all.
--
-- Future multi-user support: add an `organisations` / `projects` table and an
-- `organisation_id` column, then widen the policies. The rest of the schema
-- does not need to change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared helper: keep updated_at current on every UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (one row per auth user). Created automatically on sign-up.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Supplier categories (shared reference list)
-- -----------------------------------------------------------------------------
create table public.supplier_categories (
  id         smallint generated always as identity primary key,
  name       text not null unique check (char_length(name) between 1 and 60),
  sort_order smallint not null default 100
);

insert into public.supplier_categories (name, sort_order) values
  ('Concrete', 10),
  ('Reinforcement steel', 20),
  ('Quarry materials', 30),
  ('Asphalt', 40),
  ('Drainage materials', 50),
  ('Plant hire', 60),
  ('Equipment hire', 70),
  ('Electrical', 80),
  ('Plumbing', 90),
  ('Civil subcontractors', 100),
  ('Traffic control', 110),
  ('Surveying', 120),
  ('Other', 999);

-- -----------------------------------------------------------------------------
-- Suppliers
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id                 bigint generated always as identity primary key,
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name       text not null check (char_length(btrim(company_name)) between 1 and 200),
  contact_name       text check (char_length(contact_name) <= 120),
  phone              text check (char_length(phone) <= 40),
  email              text check (char_length(email) <= 200),
  website            text check (char_length(website) <= 300),
  service_area       text check (char_length(service_area) <= 200),
  materials_supplied text check (char_length(materials_supplied) <= 2000),
  notes              text check (char_length(notes) <= 5000),
  is_archived        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Prevent accidental duplicate suppliers (case-insensitive) per owner
create unique index suppliers_owner_company_name_key
  on public.suppliers (owner_id, lower(company_name));
create index suppliers_owner_archived_idx
  on public.suppliers (owner_id, is_archived);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Supplier ↔ category (many-to-many)
-- -----------------------------------------------------------------------------
create table public.supplier_category_links (
  supplier_id bigint not null references public.suppliers (id) on delete cascade,
  category_id smallint not null references public.supplier_categories (id) on delete restrict,
  primary key (supplier_id, category_id)
);

create index supplier_category_links_category_idx
  on public.supplier_category_links (category_id);

-- -----------------------------------------------------------------------------
-- RFQs (Requests for Quotation)
-- -----------------------------------------------------------------------------
create table public.rfqs (
  id             bigint generated always as identity primary key,
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_name   text not null check (char_length(btrim(project_name)) between 1 and 200),
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  description    text not null check (char_length(btrim(description)) between 1 and 5000),
  quantity       numeric(14, 3) not null check (quantity > 0),
  unit           text not null check (char_length(unit) between 1 and 20),
  date_requested date not null default current_date,
  required_by    date,
  status         text not null default 'Draft'
                 check (status in ('Draft', 'Sent', 'Partially Quoted', 'Quoted', 'Awarded', 'Closed')),
  notes          text check (char_length(notes) <= 5000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index rfqs_owner_status_idx on public.rfqs (owner_id, status);
create index rfqs_owner_date_idx on public.rfqs (owner_id, date_requested desc);

create trigger rfqs_set_updated_at
  before update on public.rfqs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Quotations (supplier responses to an RFQ)
--
-- Totals are calculated by the application (src/lib/money.ts) using exact
-- decimal maths and stored here. The CHECK constraints make sure the stored
-- numbers are always internally consistent.
-- -----------------------------------------------------------------------------
create table public.quotations (
  id               bigint generated always as identity primary key,
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfq_id           bigint not null references public.rfqs (id) on delete restrict,
  supplier_id      bigint not null references public.suppliers (id) on delete restrict,
  quote_reference  text check (char_length(quote_reference) <= 100),
  date_received    date not null default current_date,
  description      text not null check (char_length(btrim(description)) between 1 and 5000),
  quantity         numeric(14, 3) not null check (quantity > 0),
  unit             text not null check (char_length(unit) between 1 and 20),
  unit_rate        numeric(14, 4) not null check (unit_rate >= 0),
  delivery_cost    numeric(14, 2) not null default 0 check (delivery_cost >= 0),
  gst_treatment    text not null check (gst_treatment in ('exclusive', 'inclusive', 'gst_free')),
  unit_rate_ex_gst numeric(14, 4) not null check (unit_rate_ex_gst >= 0),
  total_ex_gst     numeric(14, 2) not null check (total_ex_gst >= 0),
  gst_amount       numeric(14, 2) not null check (gst_amount >= 0),
  total_inc_gst    numeric(14, 2) not null check (total_inc_gst >= 0),
  lead_time        text check (char_length(lead_time) <= 100),
  valid_until      date,
  scope_complete   boolean not null default true,
  notes            text check (char_length(notes) <= 5000),
  is_awarded       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint quotations_totals_consistent check (total_inc_gst = total_ex_gst + gst_amount),
  constraint quotations_gst_free_has_no_gst check (gst_treatment <> 'gst_free' or gst_amount = 0)
);

-- Only one awarded quotation per RFQ
create unique index quotations_one_award_per_rfq
  on public.quotations (rfq_id) where is_awarded;
create index quotations_rfq_idx on public.quotations (rfq_id);
create index quotations_supplier_idx on public.quotations (supplier_id);
create index quotations_owner_date_idx on public.quotations (owner_id, date_received desc);

create trigger quotations_set_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- `(select auth.uid())` is the Supabase-recommended form (evaluated once per
-- query rather than once per row).
-- =============================================================================
alter table public.profiles                enable row level security;
alter table public.supplier_categories     enable row level security;
alter table public.suppliers               enable row level security;
alter table public.supplier_category_links enable row level security;
alter table public.rfqs                    enable row level security;
alter table public.quotations              enable row level security;

-- Profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Categories: any logged-in user can read. Changes are made via SQL only.
create policy "categories: read" on public.supplier_categories
  for select to authenticated using (true);

-- Suppliers
create policy "suppliers: read own" on public.suppliers
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "suppliers: insert own" on public.suppliers
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "suppliers: update own" on public.suppliers
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "suppliers: delete own" on public.suppliers
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Supplier category links: allowed when the parent supplier is yours
create policy "supplier links: read own" on public.supplier_category_links
  for select to authenticated using (
    exists (select 1 from public.suppliers s where s.id = supplier_id and s.owner_id = (select auth.uid()))
  );
create policy "supplier links: insert own" on public.supplier_category_links
  for insert to authenticated with check (
    exists (select 1 from public.suppliers s where s.id = supplier_id and s.owner_id = (select auth.uid()))
  );
create policy "supplier links: delete own" on public.supplier_category_links
  for delete to authenticated using (
    exists (select 1 from public.suppliers s where s.id = supplier_id and s.owner_id = (select auth.uid()))
  );

-- RFQs
create policy "rfqs: read own" on public.rfqs
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "rfqs: insert own" on public.rfqs
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "rfqs: update own" on public.rfqs
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "rfqs: delete own" on public.rfqs
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Quotations: you must own the quotation AND the RFQ and supplier it points to
create policy "quotations: read own" on public.quotations
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "quotations: insert own" on public.quotations
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.rfqs r where r.id = rfq_id and r.owner_id = (select auth.uid()))
    and exists (select 1 from public.suppliers s where s.id = supplier_id and s.owner_id = (select auth.uid()))
  );
create policy "quotations: update own" on public.quotations
  for update to authenticated using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.rfqs r where r.id = rfq_id and r.owner_id = (select auth.uid()))
    and exists (select 1 from public.suppliers s where s.id = supplier_id and s.owner_id = (select auth.uid()))
  );
create policy "quotations: delete own" on public.quotations
  for delete to authenticated using (owner_id = (select auth.uid()));

-- =============================================================================
-- Privileges: anonymous visitors get nothing; logged-in users go through RLS.
-- =============================================================================
revoke all on all tables in schema public from anon;
grant select on public.supplier_categories to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.suppliers, public.supplier_category_links,
  public.rfqs, public.quotations to authenticated;
grant usage on all sequences in schema public to authenticated;

-- =============================================================================
-- Database functions (run with the caller's permissions, so RLS still applies)
-- =============================================================================

-- Replace a supplier's categories in a single transaction
create or replace function public.set_supplier_categories(p_supplier_id bigint, p_category_ids smallint[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.suppliers where id = p_supplier_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Supplier not found' using errcode = 'P0002';
  end if;

  delete from public.supplier_category_links where supplier_id = p_supplier_id;

  insert into public.supplier_category_links (supplier_id, category_id)
  select distinct p_supplier_id, c
  from unnest(coalesce(p_category_ids, '{}'::smallint[])) as c;
end;
$$;

-- Mark one quotation as the successful supplier for its RFQ (user-initiated)
create or replace function public.award_quotation(p_quotation_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rfq_id bigint;
begin
  select rfq_id into v_rfq_id
  from public.quotations
  where id = p_quotation_id and owner_id = (select auth.uid());

  if v_rfq_id is null then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- Clear any previous award first (the unique index allows only one)
  update public.quotations set is_awarded = false
  where rfq_id = v_rfq_id and is_awarded and id <> p_quotation_id;

  update public.quotations set is_awarded = true where id = p_quotation_id;
  update public.rfqs set status = 'Awarded' where id = v_rfq_id;
end;
$$;

-- Remove the award from an RFQ (e.g. selected by mistake)
create or replace function public.clear_award(p_rfq_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.rfqs where id = p_rfq_id and owner_id = (select auth.uid())
  ) then
    raise exception 'RFQ not found' using errcode = 'P0002';
  end if;

  update public.quotations set is_awarded = false where rfq_id = p_rfq_id and is_awarded;
  update public.rfqs set status = 'Quoted' where id = p_rfq_id and status = 'Awarded';
end;
$$;

revoke execute on function public.set_supplier_categories(bigint, smallint[]) from public, anon;
revoke execute on function public.award_quotation(bigint) from public, anon;
revoke execute on function public.clear_award(bigint) from public, anon;
grant execute on function public.set_supplier_categories(bigint, smallint[]) to authenticated;
grant execute on function public.award_quotation(bigint) to authenticated;
grant execute on function public.clear_award(bigint) to authenticated;

-- =============================================================================
-- Historical pricing view
-- security_invoker = true means the view respects the RLS of the underlying
-- tables, so users only ever see their own quotations.
-- =============================================================================
create view public.price_history
with (security_invoker = true)
as
select
  q.id               as quotation_id,
  q.owner_id,
  q.date_received,
  q.description,
  q.quantity,
  q.unit,
  q.unit_rate,
  q.unit_rate_ex_gst,
  q.delivery_cost,
  q.gst_treatment,
  q.total_ex_gst,
  q.total_inc_gst,
  q.lead_time,
  q.valid_until,
  q.quote_reference,
  q.is_awarded,
  s.id               as supplier_id,
  s.company_name     as supplier_name,
  r.id               as rfq_id,
  r.title            as rfq_title,
  r.project_name,
  lower(concat_ws(' ', q.description, r.title, r.description, s.company_name, q.quote_reference)) as search_text
from public.quotations q
join public.suppliers s on s.id = q.supplier_id
join public.rfqs r on r.id = q.rfq_id;

revoke all on public.price_history from anon;
grant select on public.price_history to authenticated;
