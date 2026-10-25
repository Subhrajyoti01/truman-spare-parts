-- TEAM TRUMAN role and job-card workflow update
-- Run this AFTER your existing schema.sql in Supabase SQL Editor.

create or replace function public.close_job_card(p_job_card_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_cards%rowtype; w uuid;
begin
 w:=public.current_workshop_id();
 if not public.has_workshop_role(array['workshop_admin','storekeeper']::public.workshop_role[]) then raise exception 'Only workshop admin or storekeeper can close job cards'; end if;
 select * into j from public.job_cards where id=p_job_card_id and workshop_id=w for update;
 if not found or j.status<>'Open' then raise exception 'Only an open job card can be closed'; end if;
 update public.job_cards set status='Closed',updated_at=now() where id=j.id;
 perform public.audit_event(w,'JOB_CARD_CLOSED',j.job_number,null,jsonb_build_object('job_card_id',j.id));
end $$;

create or replace function public.update_job_card(
 p_job_card_id uuid,p_job_number text,p_vehicle_identifier text,p_vehicle_model text,
 p_technician_identifier text,p_customer_reference text,p_work_description text,p_notes text
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_cards%rowtype; w uuid;
begin
 w:=public.current_workshop_id();
 if w is null or not public.has_workshop_role(array['workshop_admin','storekeeper']::public.workshop_role[]) then raise exception 'Only workshop admin or storekeeper can edit job cards'; end if;
 select * into j from public.job_cards where id=p_job_card_id and workshop_id=w for update;
 if not found then raise exception 'Job card not found'; end if;
 if j.status in ('Rejected','Closed') and not public.has_workshop_role(array['workshop_admin']::public.workshop_role[]) then raise exception 'Only the workshop administrator can edit rejected or closed job cards'; end if;
 if nullif(trim(p_job_number),'') is null or nullif(trim(p_vehicle_identifier),'') is null or nullif(trim(p_technician_identifier),'') is null or nullif(trim(p_work_description),'') is null then raise exception 'Job number, vehicle, technician and work description are required'; end if;
 update public.job_cards set job_number=trim(p_job_number),vehicle_identifier=trim(p_vehicle_identifier),vehicle_model=p_vehicle_model,technician_identifier=trim(p_technician_identifier),customer_reference=p_customer_reference,work_description=trim(p_work_description),notes=p_notes,updated_at=now() where id=j.id;
 perform public.audit_event(w,'JOB_CARD_UPDATED',trim(p_job_number),null,jsonb_build_object('job_card_id',j.id,'previous_status',j.status));
end $$;

-- Admin and storekeeper can approve/reject provisional job cards.
create or replace function public.approve_provisional_job_card(p_job_card_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_cards%rowtype; w uuid;
begin
 w:=public.current_workshop_id();
 if not public.has_workshop_role(array['workshop_admin','storekeeper']::public.workshop_role[]) then raise exception 'Only workshop admin or storekeeper can approve provisional cards'; end if;
 select * into j from public.job_cards where id=p_job_card_id and workshop_id=w for update;
 if not found or j.card_type<>'Provisional' or j.status<>'Pending Approval' then raise exception 'Provisional job card not found or not pending approval'; end if;
 update public.job_cards set status='Open',approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=j.id;
 perform public.audit_event(w,'JOB_CARD_APPROVED',j.job_number,null,jsonb_build_object('job_card_id',j.id));
end $$;

create or replace function public.reject_provisional_job_card(p_job_card_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_cards%rowtype; w uuid;
begin
 w:=public.current_workshop_id();
 if not public.has_workshop_role(array['workshop_admin','storekeeper']::public.workshop_role[]) then raise exception 'Only workshop admin or storekeeper can reject provisional cards'; end if;
 select * into j from public.job_cards where id=p_job_card_id and workshop_id=w for update;
 if not found or j.card_type<>'Provisional' or j.status<>'Pending Approval' then raise exception 'Provisional job card not found or not pending approval'; end if;
 update public.job_cards set status='Rejected',rejection_reason=coalesce(nullif(trim(p_reason),''),'Rejected by authorized staff'),updated_at=now() where id=j.id;
 perform public.audit_event(w,'JOB_CARD_REJECTED',j.job_number,null,jsonb_build_object('job_card_id',j.id,'reason',p_reason));
end $$;

-- Only admin/auditor see the complete audit history. Storekeepers see operational
-- activity related to stock, parts, job cards, purchase orders and exceptions.
drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated
using (
 workshop_id=public.current_workshop_id() and (
  public.has_workshop_role(array['workshop_admin','auditor']::public.workshop_role[])
  or (
   public.has_workshop_role(array['storekeeper']::public.workshop_role[])
   and event_type in (
    'PART_CREATED','PART_UPDATED','PART_DELETED','STOCK_RECEIVED','STOCK_ISSUED','STOCK_ADJUSTED',
    'JOB_CARD_CREATED','JOB_CARD_UPDATED','JOB_CARD_APPROVED','JOB_CARD_REJECTED','JOB_CARD_CLOSED',
    'STOCK_OUT_EXCEPTION_CREATED','STOCK_OUT_EXCEPTION_RESOLVED',
    'PURCHASE_ORDER_CREATED','PURCHASE_ORDER_UPDATED','PURCHASE_ORDER_RECEIVED'
   )
  )
 )
);

-- Keep functions callable by signed-in app users; each function performs its own role check.
grant execute on function public.close_job_card(uuid) to authenticated;
grant execute on function public.update_job_card(uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.approve_provisional_job_card(uuid,text) to authenticated;
grant execute on function public.reject_provisional_job_card(uuid,text) to authenticated;


-- Only the workshop administrator can reopen a rejected or closed job card.
-- Reopened cards return to Open so they can be selected in Issue Parts.
create or replace function public.reopen_job_card(p_job_card_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.job_cards%rowtype; w uuid;
begin
 w:=public.current_workshop_id();
 if w is null or not public.has_workshop_role(array['workshop_admin']::public.workshop_role[]) then
  raise exception 'Only the workshop administrator can reopen job cards';
 end if;
 select * into j from public.job_cards where id=p_job_card_id and workshop_id=w for update;
 if not found or j.status not in ('Rejected','Closed') then
  raise exception 'Only a rejected or closed job card can be reopened';
 end if;
 update public.job_cards set status='Open',rejection_reason=null,updated_at=now() where id=j.id;
 perform public.audit_event(w,'JOB_CARD_REOPENED',j.job_number,null,jsonb_build_object('job_card_id',j.id,'previous_status',j.status));
end $$;

grant execute on function public.reopen_job_card(uuid) to authenticated;
