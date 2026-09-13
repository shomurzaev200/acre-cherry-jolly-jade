alter table user_integrations add column if not exists meta_app_id text not null default '';
alter table user_integrations add column if not exists meta_app_secret text not null default '';

alter table videos add column if not exists file_name text not null default '';

alter table publication_tasks add column if not exists ig_container_id text;
alter table publication_tasks add column if not exists ig_media_id text;
