-- Interactive board policies and supporting foreign-key indexes

create policy "boards_member_insert"
on public.boards for insert
with check (public.is_workspace_member(workspace_id));

create policy "boards_member_update"
on public.boards for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "lists_member_insert"
on public.lists for insert
with check (public.is_board_member(board_id));

create policy "lists_member_update"
on public.lists for update
using (public.is_board_member(board_id))
with check (public.is_board_member(board_id));

create policy "cards_member_insert"
on public.cards for insert
with check (
  public.is_board_member(board_id)
  and exists (select 1 from public.lists l where l.id = list_id and l.board_id = board_id)
  and (created_by is null or created_by = auth.uid())
);

create policy "cards_member_update"
on public.cards for update
using (public.is_board_member(board_id))
with check (
  public.is_board_member(board_id)
  and exists (select 1 from public.lists l where l.id = list_id and l.board_id = board_id)
);

create policy "card_members_member_insert"
on public.card_members for insert
with check (
  exists (select 1 from public.cards c where c.id = card_id and public.is_board_member(c.board_id))
);

create policy "card_members_member_delete"
on public.card_members for delete
using (
  exists (select 1 from public.cards c where c.id = card_id and public.is_board_member(c.board_id))
);

create policy "comments_member_insert"
on public.comments for insert
with check (
  user_id = auth.uid()
  and exists (select 1 from public.cards c where c.id = card_id and public.is_board_member(c.board_id))
);

create policy "comments_member_update"
on public.comments for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_lists_board on public.lists(board_id);
create index if not exists idx_cards_list on public.cards(list_id);
create index if not exists idx_cards_created_by on public.cards(created_by);
create index if not exists idx_card_members_card on public.card_members(card_id);
create index if not exists idx_labels_board on public.labels(board_id);
create index if not exists idx_card_labels_label on public.card_labels(label_id);
create index if not exists idx_checklists_card on public.checklists(card_id);
create index if not exists idx_checklist_items_checklist on public.checklist_items(checklist_id);
create index if not exists idx_comments_card on public.comments(card_id);
create index if not exists idx_attachments_card on public.attachments(card_id);
create index if not exists idx_activities_user on public.activities(user_id);
create index if not exists idx_activities_board on public.activities(board_id);
create index if not exists idx_activities_card on public.activities(card_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
