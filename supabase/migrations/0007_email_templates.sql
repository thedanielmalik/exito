create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  description text,
  subject text not null default '',
  preheader text,
  design jsonb not null default '{}'::jsonb,
  html text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index if not exists idx_email_templates_org_category on public.email_templates(organization_id, category);

alter table public.email_templates enable row level security;

drop policy if exists email_templates_member_select on public.email_templates;
create policy email_templates_member_select on public.email_templates
for select using (public.is_org_member(organization_id));

drop policy if exists email_templates_member_insert on public.email_templates;
create policy email_templates_member_insert on public.email_templates
for insert with check (public.is_org_member(organization_id) and (created_by is null or created_by = auth.uid()));

drop policy if exists email_templates_member_update on public.email_templates;
create policy email_templates_member_update on public.email_templates
for update using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists email_templates_member_delete on public.email_templates;
create policy email_templates_member_delete on public.email_templates
for delete using (public.is_org_member(organization_id));

create or replace function public.set_email_template_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_email_template_updated_at();

revoke all on function public.set_email_template_updated_at() from public, anon, authenticated;

with org as (
  select id from public.organizations where slug = 'exito' limit 1
)
insert into public.email_templates
  (organization_id, name, category, description, subject, preheader, design, html)
select
  org.id,
  v.name, v.category, v.description, v.subject, v.preheader, v.design::jsonb, v.html
from org
cross join (values
('Clean Announcement','Announcement','Minimal product or company announcement','A fresh update from your team','A quick update from Exito','{"accent":"#635bff","layout":"hero","blocks":["eyebrow","headline","body","cta","footer"]}',''),
('Product Launch','Marketing','Product, service or offer launch','Launch a new product with a strong hero and CTA','Introducing something new','{"accent":"#111827","layout":"hero-image","blocks":["eyebrow","headline","image","body","cta","footer"]}',''),
('Newsletter','Newsletter','Reusable editorial newsletter','Weekly or monthly newsletter with multiple stories','Your weekly update','{"accent":"#0d1b3d","layout":"newsletter","blocks":["header","intro","story","story","cta","footer"]}',''),
('Event Invitation','Events','Invitations for conferences, webinars and events','Event-focused email with date, venue and CTA','You are invited','{"accent":"#f26d21","layout":"event","blocks":["eyebrow","headline","image","event-details","body","cta","footer"]}',''),
('Event Reminder','Events','Reminder before an upcoming event','Short, high-clarity reminder email','Reminder: your event is coming up','{"accent":"#f26d21","layout":"reminder","blocks":["eyebrow","headline","event-details","cta","footer"]}',''),
('Welcome / Onboarding','Lifecycle','Welcome new customers, students or members','Warm welcome and next steps','Welcome — let’s get started','{"accent":"#16a34a","layout":"welcome","blocks":["headline","body","steps","cta","footer"]}',''),
('Sales Follow-up','Sales','Professional follow-up after a conversation','Keep a lead moving with a clear next action','Following up on our conversation','{"accent":"#111827","layout":"sales","blocks":["headline","body","quote","cta","footer"]}',''),
('Sponsorship Proposal','Business','Premium sponsor or partnership outreach','Corporate sponsorship and partnership pitch','Partnership opportunity','{"accent":"#0d1b3d","layout":"proposal","blocks":["logo","headline","body","stats","cta","footer"]}',''),
('Video / Story','Media','Video-led campaign or announcement','Large visual with video thumbnail and fallback CTA','Watch the story','{"accent":"#ef4444","layout":"video","blocks":["headline","video","body","cta","footer"]}',''),
('Thank You','Lifecycle','Post-event, post-purchase or appreciation','Simple thank-you with optional image and CTA','Thank you','{"accent":"#daaf37","layout":"thank-you","blocks":["headline","body","image","cta","footer"]}','')
) as v(name,category,description,subject,preheader,design,html)
on conflict (organization_id, name) do nothing;
