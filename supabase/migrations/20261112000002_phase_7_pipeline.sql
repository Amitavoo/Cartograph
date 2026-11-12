-- Phase 7 Migration: Pipeline Stages, Realtime Broadcast Trigger & Channel Authorization

-- 1. Add stage and tracking columns to analyses
alter table public.analyses
  add column if not exists stage text not null default 'queued'
  check (stage in ('queued', 'fetching', 'selecting', 'parsing', 'storing', 'completed', 'failed'));

alter table public.analyses
  add column if not exists stage_message text default 'Queued';

alter table public.analyses
  add column if not exists failed_at_stage text;

alter table public.analyses
  add column if not exists updated_at timestamptz not null default now();

-- 2. Add lines column to files
alter table public.files
  add column if not exists lines integer not null default 0;

-- 3. Trigger to broadcast stage changes to realtime channel 'analysis:<id>'
create or replace function public.broadcast_analysis_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or 
     (old.stage is distinct from new.stage) or 
     (old.stage_message is distinct from new.stage_message) or
     (old.status is distinct from new.status) or
     (old.error_message is distinct from new.error_message) then

    perform realtime.send(
      jsonb_build_object(
        'analysis_id', new.id,
        'stage', new.stage,
        'message', new.stage_message,
        'status', new.status,
        'error_message', new.error_message,
        'file_count', new.file_count,
        'edge_count', new.edge_count,
        'coverage_percentage', new.coverage_percentage
      ),
      'stage_change',
      'analysis:' || new.id::text,
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_broadcast_analysis_stage on public.analyses;
create trigger tr_broadcast_analysis_stage
after insert or update on public.analyses
for each row
execute function public.broadcast_analysis_stage();

-- 4. RLS Policy on realtime.messages
-- Ensures only organization members can subscribe to an analysis channel
drop policy if exists "analysis_channel_receive_policy" on "realtime"."messages";
create policy "analysis_channel_receive_policy"
on "realtime"."messages"
for select
to authenticated, anon
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1 from public.analyses a
    where ('analysis:' || a.id::text) = (select realtime.topic())
      and a.organization_id = (select auth_org_id())
  )
);
