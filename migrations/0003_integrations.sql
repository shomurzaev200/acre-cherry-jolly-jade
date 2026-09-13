-- Secrets live only on the user's VPS. Never returned in full to the browser.

create table if not exists user_integrations (
  user_id text primary key,
  telegram_bot_token text not null default '',
  telegram_chat_id text not null default '',
  gemini_api_key text not null default '',
  updated_at timestamptz not null default now()
);

alter table ig_accounts add column if not exists meta_access_token text not null default '';
alter table ig_accounts add column if not exists ig_business_id text not null default '';
