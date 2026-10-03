update public.profiles
set role = (case role::text
  when 'submitter' then 'qms'
  when 'reviewer' then 'qmsr'
  when 'viewer' then 'qms'
  else role::text
end)::public.app_role
where role::text in ('submitter', 'reviewer', 'viewer');

alter table public.profiles alter column role set default 'qms';

create or replace function public.can_review()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'qms_section_head', 'qmsr'), false)
$$;

create or replace function public.valid_status_transition(old_status public.document_status, new_status public.document_status)
returns boolean language sql immutable
as $$
  select case old_status
    when 'draft' then new_status = 'submitted'
    when 'submitted' then new_status = 'under_review'
    when 'under_review' then new_status in ('need_revision', 'qmsr_review')
    when 'qmsr_review' then new_status in ('need_revision', 'approved', 'rejected')
    when 'need_revision' then new_status = 'resubmitted'
    when 'resubmitted' then new_status = 'under_review'
    when 'approved' then new_status = 'closed'
    else false
  end
$$;

create or replace function public.enforce_document_workflow()
returns trigger language plpgsql security definer set search_path = public
as $$
declare actor_role public.app_role;
begin
  actor_role := public.current_app_role();
  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() and actor_role <> 'admin' then
      raise exception 'Cannot create a submission for another user';
    end if;
    if actor_role not in ('admin', 'qms') then
      raise exception 'Only QMS users can create submissions';
    end if;
    if new.status = 'submitted' and new.reviewer_id is null then
      raise exception 'Assign a QMSR reviewer before submission';
    end if;
    return new;
  end if;

  if actor_role = 'qms' then
    if old.created_by is distinct from auth.uid() then
      raise exception 'QMS users can only edit their own submissions';
    end if;
    if old.status not in ('draft', 'need_revision') and
      (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks,new.created_by)
      is distinct from
      (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks,old.created_by) then
      raise exception 'Submission metadata is locked at this workflow stage';
    end if;
  elsif actor_role in ('qms_section_head', 'qmsr') and
    (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks,new.created_by)
    is distinct from
    (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks,old.created_by) then
    raise exception 'Reviewers cannot edit submission metadata';
  end if;

  if new.status is distinct from old.status then
    if not public.valid_status_transition(old.status, new.status) then
      raise exception 'Invalid QMS status transition: % -> %', old.status, new.status;
    end if;
    if new.status in ('submitted', 'resubmitted') and actor_role not in ('admin', 'qms') then
      raise exception 'Only QMS users can submit or resubmit documents';
    end if;
    if new.status in ('submitted', 'resubmitted') and new.reviewer_id is null then
      raise exception 'Assign a QMSR reviewer before submission';
    end if;
    if new.status in ('under_review', 'qmsr_review') and actor_role not in ('admin', 'qms_section_head') then
      raise exception 'QMS Section Head permission required';
    end if;
    if new.status in ('approved', 'rejected') and actor_role not in ('admin', 'qmsr') then
      raise exception 'QMSR permission required';
    end if;
    if new.status = 'need_revision' then
      if old.status = 'under_review' and actor_role not in ('admin', 'qms_section_head') then
        raise exception 'QMS Section Head permission required';
      elsif old.status = 'qmsr_review' and actor_role not in ('admin', 'qmsr') then
        raise exception 'QMSR permission required';
      end if;
    end if;
    if new.status in ('need_revision', 'rejected') and length(trim(coalesce(current_setting('app.review_note', true), ''))) = 0 then
      raise exception 'Review note is required';
    end if;
    if new.status = 'approved' then
      new.approval_date := coalesce(new.approval_date, (now() at time zone 'Asia/Jakarta')::date);
    end if;
    if new.status = 'closed' then
      new.closed_at := coalesce(new.closed_at, now());
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.transition_document(p_document_id uuid, p_new_status public.document_status, p_note text default null)
returns public.document_submissions
language plpgsql security invoker set search_path = public
as $$
declare target public.document_submissions;
begin
  if p_new_status in ('need_revision', 'rejected') and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'Review note is required';
  end if;
  perform set_config('app.review_note', coalesce(p_note, ''), true);
  update public.document_submissions set status = p_new_status where id = p_document_id returning * into target;
  if target.id is null then
    raise exception 'Document not found or access denied';
  end if;
  return target;
end
$$;

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
      case new.status
        when 'submitted' then 'submitted'
        when 'under_review' then 'review_started'
        when 'qmsr_review' then 'qmsr_review_started'
        when 'need_revision' then 'need_revision'
        when 'resubmitted' then 'resubmitted'
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        when 'closed' then 'closed'
        else 'document_updated'
      end,
      old.status,new.status,auth.uid(),
      (select full_name from public.profiles where id = auth.uid()),
      nullif(current_setting('app.review_note', true),''));
  end if;
  return new;
end
$$;

drop policy if exists submissions_read_authenticated on public.document_submissions;
create policy submissions_read_authenticated on public.document_submissions for select to authenticated
using(public.current_app_role() in ('admin','qms_section_head') or created_by=auth.uid() or reviewer_id=auth.uid());

drop policy if exists submissions_create_submitter on public.document_submissions;
create policy submissions_create_submitter on public.document_submissions for insert to authenticated
with check(public.current_app_role() in ('admin','qms') and created_by=auth.uid());

drop policy if exists submissions_update_roles on public.document_submissions;
create policy submissions_update_roles on public.document_submissions for update to authenticated
using(public.current_app_role() in ('admin','qms_section_head') or (public.current_app_role()='qms' and created_by=auth.uid()) or (public.current_app_role()='qmsr' and reviewer_id=auth.uid()))
with check(public.current_app_role() in ('admin','qms','qms_section_head','qmsr'));

drop policy if exists followups_create_roles on public.document_followups;
create policy followups_create_roles on public.document_followups for insert to authenticated
with check(created_by=auth.uid() and public.current_app_role() in ('admin','qms','qms_section_head','qmsr') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));

drop policy if exists followups_update_creator_admin on public.document_followups;
create policy followups_update_creator_admin on public.document_followups for update to authenticated
using((created_by=auth.uid() or public.current_app_role()='admin') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));

drop policy if exists attachments_add_roles on public.document_attachments;
create policy attachments_add_roles on public.document_attachments for insert to authenticated
with check(uploaded_by=auth.uid() and public.current_app_role() in ('admin','qms','qms_section_head','qmsr') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));
