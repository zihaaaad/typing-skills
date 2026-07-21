-- Required for the forgot-password / reset-password flow
-- (src/app/api/auth/forgot-password, src/app/api/auth/reset-password).
-- Run this once in the Supabase SQL editor for this project.

alter table users add column if not exists reset_token text;
alter table users add column if not exists reset_token_expires_at timestamptz;

create index if not exists idx_users_reset_token on users (reset_token);
