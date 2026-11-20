-- Run AFTER the database import and `alembic upgrade head`.
-- FastAPI owns authentication. Browser Supabase roles must not read finance
-- tables directly; the backend connects as postgres and enforces user ownership.
begin;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'users', 'transactions', 'budgets', 'achievements', 'user_achievements',
    'goals', 'recurring_transactions', 'telegram_state', 'alembic_version'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

-- Only avatar images are public. Upload/delete use backend-only S3 credentials.
-- Retain the legacy 5 MiB storage allowance for imported avatars. New API
-- uploads are limited to 4 MiB to fit Vercel's request payload limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
