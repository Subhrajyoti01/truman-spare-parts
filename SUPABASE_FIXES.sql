-- TEAM TRUMAN existing-project patch: install admin-only part deletion safely.
-- Run this in Supabase SQL Editor as project owner. Does not recreate tables.
create or replace function public.admin_delete_part(p_part_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  w uuid;
  p public.parts%rowtype;
begin
  w := public.current_workshop_id();
  if auth.uid() is null or w is null
     or not public.has_workshop_role(array['workshop_admin']::public.workshop_role[]) then
    raise exception 'Only a workshop administrator can delete parts';
  end if;

  select * into p
  from public.parts
  where id = p_part_id and workshop_id = w
  for update;

  if not found then
    raise exception 'Part not found in this workshop';
  end if;
  if p.current_stock <> 0 then
    raise exception 'Cannot delete a part with stock remaining. Use controlled adjustment first.';
  end if;
  if exists (select 1 from public.stock_movements where part_id = p.id)
     or exists (select 1 from public.purchase_orders where part_id = p.id) then
    raise exception 'Part has movement/order history and cannot be deleted.';
  end if;

  perform public.audit_event(w, 'PART_DELETED', p.sku, p.sku,
    jsonb_build_object('part_id', p.id, 'part_name', p.name));
  delete from public.parts where id = p.id;
end;
$$;

revoke all on function public.admin_delete_part(uuid) from public;
revoke all on function public.admin_delete_part(uuid) from anon;
grant execute on function public.admin_delete_part(uuid) to authenticated;

-- Ask PostgREST/Supabase to refresh its function schema cache.
notify pgrst, 'reload schema';
