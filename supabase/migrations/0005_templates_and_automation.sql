create table if not exists public.board_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.board_template_lists (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.board_templates(id) on delete cascade,
  name text not null,
  position numeric not null default 1000
);

create table if not exists public.board_template_labels (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.board_templates(id) on delete cascade,
  name text not null,
  color text not null default '#635bff'
);

create table if not exists public.board_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.board_templates(id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text','number','select','date','checkbox')),
  options jsonb not null default '[]'::jsonb,
  position numeric not null default 1000
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('card_created','card_moved','card_completed','due_date_approaching')),
  action_type text not null check (action_type in ('move_card','add_label','assign_member','create_comment')),
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_board_templates_org on public.board_templates(organization_id);
create index if not exists idx_template_lists_template on public.board_template_lists(template_id);
create index if not exists idx_template_labels_template on public.board_template_labels(template_id);
create index if not exists idx_template_fields_template on public.board_template_fields(template_id);
create index if not exists idx_automation_rules_board on public.automation_rules(board_id);
create index if not exists idx_automation_rules_created_by on public.automation_rules(created_by);
create index if not exists idx_board_templates_created_by on public.board_templates(created_by);

alter table public.board_templates enable row level security;
alter table public.board_template_lists enable row level security;
alter table public.board_template_labels enable row level security;
alter table public.board_template_fields enable row level security;
alter table public.automation_rules enable row level security;

create policy "board_templates_member_select" on public.board_templates for select using (public.is_org_member(organization_id));
create policy "board_templates_member_insert" on public.board_templates for insert with check (public.is_org_member(organization_id));
create policy "board_templates_member_update" on public.board_templates for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "board_templates_member_delete" on public.board_templates for delete using (public.is_org_member(organization_id));

create policy "template_lists_member_all" on public.board_template_lists for all using (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
) with check (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
);
create policy "template_labels_member_all" on public.board_template_labels for all using (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
) with check (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
);
create policy "template_fields_member_all" on public.board_template_fields for all using (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
) with check (
  exists (select 1 from public.board_templates t where t.id = template_id and public.is_org_member(t.organization_id))
);

create policy "automation_rules_member_select" on public.automation_rules for select using (
  public.is_board_member(board_id)
);
create policy "automation_rules_member_insert" on public.automation_rules for insert with check (
  public.is_board_member(board_id) and (created_by is null or created_by = auth.uid())
);
create policy "automation_rules_member_update" on public.automation_rules for update using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "automation_rules_member_delete" on public.automation_rules for delete using (public.is_board_member(board_id));

do $$
declare org uuid; uid uuid; tid uuid;
begin
  select id into org from public.organizations where slug='exito' limit 1;
  select auth.uid() into uid;
  if org is null then return; end if;

  if not exists (select 1 from public.board_templates where organization_id=org and name='WAWO Hub — Client Order Pipeline') then
    insert into public.board_templates(organization_id,name,description,icon,created_by) values (org,'WAWO Hub — Client Order Pipeline','Quote-to-delivery workflow for packaging and production jobs.','WH',uid) returning id into tid;
    insert into public.board_template_lists(template_id,name,position) values (tid,'New Request',100),(tid,'Quote',200),(tid,'Payment',300),(tid,'Artwork',400),(tid,'Approved',500),(tid,'Production',600),(tid,'QC',700),(tid,'Ready',800),(tid,'Delivered',900);
    insert into public.board_template_labels(template_id,name,color) values (tid,'Urgent','#D94A4A'),(tid,'Waiting for Client','#D8A928'),(tid,'Production','#635BFF'),(tid,'Completed','#2C9B68');
    insert into public.board_template_fields(template_id,name,field_type,options,position) values (tid,'Client Name','text','[]',100),(tid,'Order Value','number','[]',200),(tid,'Delivery Date','date','[]',300),(tid,'Payment Status','select','["Pending","Part Paid","Paid"]',400);
  end if;

  if not exists (select 1 from public.board_templates where organization_id=org and name='WAWO Brand House — Creative Pipeline') then
    insert into public.board_templates(organization_id,name,description,icon,created_by) values (org,'WAWO Brand House — Creative Pipeline','Lead, brief, design, approval and production workflow.','WB',uid) returning id into tid;
    insert into public.board_template_lists(template_id,name,position) values (tid,'Lead',100),(tid,'Brief',200),(tid,'Design',300),(tid,'Review',400),(tid,'Approved',500),(tid,'Production',600),(tid,'Delivery',700);
    insert into public.board_template_labels(template_id,name,color) values (tid,'Client Review','#D8A928'),(tid,'Rush','#D94A4A'),(tid,'Design','#635BFF'),(tid,'Approved','#2C9B68');
    insert into public.board_template_fields(template_id,name,field_type,options,position) values (tid,'Client','text','[]',100),(tid,'Project Type','select','["Branding","Packaging","Print","Merchandise","Other"]',200),(tid,'Deadline','date','[]',300);
  end if;

  if not exists (select 1 from public.board_templates where organization_id=org and name='NFEC — Sponsorship Pipeline') then
    insert into public.board_templates(organization_id,name,description,icon,created_by) values (org,'NFEC — Sponsorship Pipeline','Sponsor and partnership pipeline from lead to completion.','NF',uid) returning id into tid;
    insert into public.board_template_lists(template_id,name,position) values (tid,'Lead',100),(tid,'Contacted',200),(tid,'Proposal',300),(tid,'Negotiation',400),(tid,'Confirmed',500),(tid,'Completed',600);
    insert into public.board_template_labels(template_id,name,color) values (tid,'Diamond','#DAAF37'),(tid,'Onyx','#252B3A'),(tid,'Sapphire','#3B82F6'),(tid,'Follow Up','#D8A928');
    insert into public.board_template_fields(template_id,name,field_type,options,position) values (tid,'Company','text','[]',100),(tid,'Package','select','["Sapphire","Onyx","Diamond","Custom"]',200),(tid,'Value','number','[]',300),(tid,'Next Follow-up','date','[]',400);
  end if;

  if not exists (select 1 from public.board_templates where organization_id=org and name='LDMA — Student Enrollment Pipeline') then
    insert into public.board_templates(organization_id,name,description,icon,created_by) values (org,'LDMA — Student Enrollment Pipeline','Lead-to-enrollment workflow for training programmes.','LD',uid) returning id into tid;
    insert into public.board_template_lists(template_id,name,position) values (tid,'Lead',100),(tid,'Contacted',200),(tid,'Interested',300),(tid,'Payment Pending',400),(tid,'Registered',500),(tid,'Attended',600),(tid,'Follow-up',700);
    insert into public.board_template_labels(template_id,name,color) values (tid,'Hot Lead','#D94A4A'),(tid,'Payment Pending','#D8A928'),(tid,'Registered','#2C9B68'),(tid,'VIP','#635BFF');
    insert into public.board_template_fields(template_id,name,field_type,options,position) values (tid,'Student Name','text','[]',100),(tid,'Programme','text','[]',200),(tid,'Fee','number','[]',300),(tid,'Payment Status','select','["Pending","Part Paid","Paid"]',400);
  end if;
end $$;