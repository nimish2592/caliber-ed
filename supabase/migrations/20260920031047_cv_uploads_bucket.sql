-- Private CV bucket for the higher-ed SaaS.
-- Objects are written by the Next.js server with the service role (bypasses RLS).
-- No anon/authenticated policies: students and browsers cannot list or read files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-uploads',
  'cv-uploads',
  false,
  8388608,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
