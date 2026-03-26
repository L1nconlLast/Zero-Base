-- ============================================================
-- Expandir MIME types aceitos no bucket de anexos dos grupos
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'group-message-attachments',
  'group-message-attachments',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/avif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
where not exists (
  select 1 from storage.buckets where id = 'group-message-attachments'
);

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/avif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
where id = 'group-message-attachments';
