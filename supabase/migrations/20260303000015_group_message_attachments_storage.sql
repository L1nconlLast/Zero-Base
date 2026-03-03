-- ============================================================
-- Storage para anexos de mensagens dos grupos
-- Bucket: group-message-attachments
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'group-message-attachments',
  'group-message-attachments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[]
where not exists (
  select 1 from storage.buckets where id = 'group-message-attachments'
);

drop policy if exists "group_attachments_public_read" on storage.objects;
create policy "group_attachments_public_read"
on storage.objects
for select
to public
using (bucket_id = 'group-message-attachments');

drop policy if exists "group_attachments_auth_insert" on storage.objects;
create policy "group_attachments_auth_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'group-message-attachments');

drop policy if exists "group_attachments_auth_update" on storage.objects;
create policy "group_attachments_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'group-message-attachments')
with check (bucket_id = 'group-message-attachments');

drop policy if exists "group_attachments_auth_delete" on storage.objects;
create policy "group_attachments_auth_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'group-message-attachments');
