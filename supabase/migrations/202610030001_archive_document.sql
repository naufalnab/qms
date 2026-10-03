create or replace function public.archive_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_document public.document_submissions;
begin
  if public.current_app_role() is distinct from 'admin'::public.app_role then
    raise exception 'Only active admins can delete documents';
  end if;

  update public.document_submissions
  set archived_at = coalesce(archived_at, now())
  where id = p_document_id and archived_at is null
  returning * into archived_document;

  if archived_document.id is null then
    raise exception 'Document not found or already deleted';
  end if;

  insert into public.document_history (
    document_id, event_type, previous_status, new_status, changed_by, reviewer_name
  ) values (
    archived_document.id, 'archived', archived_document.status, archived_document.status,
    auth.uid(), (select full_name from public.profiles where id = auth.uid())
  );
end;
$$;

revoke all on function public.archive_document(uuid) from public;
grant execute on function public.archive_document(uuid) to authenticated;
