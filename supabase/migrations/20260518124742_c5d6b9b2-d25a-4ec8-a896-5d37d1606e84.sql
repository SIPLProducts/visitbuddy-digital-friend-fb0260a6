
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid null,
  visitor_code text null,
  recipient_phone text not null,
  sender_id text null,
  message text not null,
  provider text not null default 'sms_striker',
  provider_job_id text null,
  http_status integer null,
  provider_status_code text null,
  provider_message text null,
  status text not null default 'submitted',
  raw_response text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_visitor_id on public.sms_logs(visitor_id);
create index if not exists idx_sms_logs_created_at on public.sms_logs(created_at desc);

alter table public.sms_logs enable row level security;

drop policy if exists "HO admins can view sms logs" on public.sms_logs;
create policy "HO admins can view sms logs"
on public.sms_logs for select
to authenticated
using (public.is_ho_admin(auth.uid()));

drop policy if exists "Location admins can view sms logs" on public.sms_logs;
create policy "Location admins can view sms logs"
on public.sms_logs for select
to authenticated
using (exists (
  select 1 from public.user_location_roles ulr
  where ulr.user_id = auth.uid() and ulr.role = 'admin'
));
