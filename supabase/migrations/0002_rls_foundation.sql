-- Exito RLS foundation
-- Policies are intentionally explicit and organization-aware.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
alter table public.card_members enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_member(target_board uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards b
    join public.workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = target_board
      and wm.user_id = auth.uid()
  );
$$;

create policy "profiles_self_select"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_self_insert"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles_self_update"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "org_members_select"
on public.organization_members for select
using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy "organizations_member_select"
on public.organizations for select
using (public.is_org_member(id));

create policy "workspaces_member_select"
on public.workspaces for select
using (public.is_org_member(organization_id));

create policy "workspace_members_select"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

create policy "boards_member_select"
on public.boards for select
using (public.is_workspace_member(workspace_id));

create policy "lists_member_select"
on public.lists for select
using (public.is_board_member(board_id));

create policy "cards_member_select"
on public.cards for select
using (public.is_board_member(board_id));

create policy "card_members_select"
on public.card_members for select
using (
  exists (
    select 1 from public.cards c
    where c.id = card_id and public.is_board_member(c.board_id)
  )
);

create policy "labels_member_select"
on public.labels for select
using (public.is_board_member(board_id));

create policy "card_labels_member_select"
on public.card_labels for select
using (
  exists (
    select 1
    from public.cards c
    where c.id = card_id and public.is_board_member(c.board_id)
  )
);

create policy "checklists_member_select"
on public.checklists for select
using (
  exists (
    select 1
    from public.cards c
    where c.id = card_id and public.is_board_member(c.board_id)
  )
);

create policy "checklist_items_member_select"
on public.checklist_items for select
using (
  exists (
    select 1
    from public.checklists cl
    join public.cards c on c.id = cl.card_id
    where cl.id = checklist_id and public.is_board_member(c.board_id)
  )
);

create policy "comments_member_select"
on public.comments for select
using (
  exists (
    select 1
    from public.cards c
    where c.id = card_id and public.is_board_member(c.board_id)
  )
);

create policy "attachments_member_select"
on public.attachments for select
using (
  exists (
    select 1
    from public.cards c
    where c.id = card_id and public.is_board_member(c.board_id)
  )
);

create policy "activities_org_member_select"
on public.activities for select
using (public.is_org_member(organization_id));

create policy "notifications_self_select"
on public.notifications for select
using (user_id = auth.uid());

create policy "notifications_self_update"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Mutation policies will be refined alongside each server operation.
