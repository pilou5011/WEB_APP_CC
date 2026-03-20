-- Add "Nom du responsable" field to clients table
-- This value is used in generated PDFs (invoice + deposit slip).

alter table public.clients
add column if not exists responsable_name text;

-- Backfill existing data: keep current behavior for older clients
-- by copying "phone_1_info" into the new field when it's empty.
update public.clients
set responsable_name = phone_1_info
where (responsable_name is null or trim(responsable_name) = '')
  and phone_1_info is not null
  and trim(phone_1_info) <> '';

