create index if not exists idx_attachments_uploaded_by on public.attachments(uploaded_by);
create index if not exists idx_boards_created_by on public.boards(created_by);
create index if not exists idx_checklist_items_assigned_to on public.checklist_items(assigned_to);
create index if not exists idx_comments_user on public.comments(user_id);