-- Keep the status-to-history mapping typed as history_action. Without this
-- cast PostgreSQL resolves the CASE expression to text, which cannot be
-- inserted into document_history.event_type.
create or replace function public.log_document_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.document_history(document_id,event_type,new_status,changed_by)
    values(new.id,'document_created',new.status,auth.uid());
    return new;
  elsif new.status is distinct from old.status then
    insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name,notes)
    values(new.id,
      (case new.status
        when 'submitted' then 'submitted'
        when 'under_review' then 'review_started'
        when 'qmsr_review' then 'qmsr_review_started'
        when 'need_revision' then 'need_revision'
        when 'resubmitted' then 'resubmitted'
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        when 'closed' then 'closed'
        else 'document_updated'
      end)::public.history_action,
      old.status,new.status,auth.uid(),
      (select full_name from public.profiles where id = auth.uid()),
      nullif(current_setting('app.review_note', true),''));
  end if;
  return new;
end
$$;
