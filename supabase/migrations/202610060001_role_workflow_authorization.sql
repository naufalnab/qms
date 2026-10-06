-- Enforce the existing QMS -> QMS Section Head -> QMSR workflow at the database boundary.
-- This migration is additive and keeps the current roles and document statuses.

alter table public.document_history
  add column if not exists actor_role public.app_role;

create or replace function public.can_view_submission(
  p_created_by uuid,
  p_reviewer_id uuid,
  p_status public.document_status
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(case public.current_app_role()
    when 'admin' then true
    when 'qms' then p_created_by = auth.uid()
    when 'qmsr' then p_reviewer_id = auth.uid()
    -- Section Head work is shared in the existing workflow (there is no per-user
    -- Section Head assignment column). Exclude drafts that have not entered review.
    when 'qms_section_head' then p_status <> 'draft'
    else false
  end, false)
$$;
revoke all on function public.can_view_submission(uuid, uuid, public.document_status) from public;
grant execute on function public.can_view_submission(uuid, uuid, public.document_status) to authenticated;

create or replace function public.can_transition_for_current_user(
  p_from public.document_status,
  p_to public.document_status,
  p_created_by uuid,
  p_reviewer_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.valid_status_transition(p_from, p_to) and case public.current_app_role()
    when 'admin' then true
    when 'qms' then p_created_by = auth.uid() and (
      (p_from = 'draft' and p_to = 'submitted') or
      (p_from = 'need_revision' and p_to = 'resubmitted') or
      (p_from = 'approved' and p_to = 'closed')
    )
    when 'qms_section_head' then
      (p_from in ('submitted', 'resubmitted') and p_to = 'under_review') or
      (p_from = 'under_review' and p_to in ('need_revision', 'qmsr_review'))
    when 'qmsr' then p_reviewer_id = auth.uid() and p_from = 'qmsr_review' and
      p_to in ('need_revision', 'approved', 'rejected')
    else false
  end, false)
$$;
revoke all on function public.can_transition_for_current_user(public.document_status, public.document_status, uuid, uuid) from public;
grant execute on function public.can_transition_for_current_user(public.document_status, public.document_status, uuid, uuid) to authenticated;

create or replace function public.enforce_document_workflow()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  actor_role public.app_role;
  reviewer_is_active boolean;
begin
  actor_role := public.current_app_role();
  if actor_role is null then
    raise exception using errcode = '42501', message = 'An active authenticated QMS profile is required';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() and actor_role <> 'admin' then
      raise exception using errcode = '42501', message = 'Cannot create a submission for another user';
    end if;
    if actor_role not in ('admin', 'qms') then
      raise exception using errcode = '42501', message = 'Only QMS users can create submissions';
    end if;
    if actor_role = 'qms' and new.status not in ('draft', 'submitted') then
      raise exception using errcode = '42501', message = 'QMS users cannot set a workflow status when creating a submission';
    end if;
    if actor_role <> 'admin' and (new.approval_date is not null or new.closed_at is not null or new.archived_at is not null) then
      raise exception using errcode = '42501', message = 'Workflow dates and archive state are system managed';
    end if;
    if new.status = 'submitted' then
      select exists(
        select 1 from public.reviewers r
        join public.profiles p on p.id = r.id
        where r.id = new.reviewer_id and r.is_active and p.is_active and p.role in ('qmsr', 'admin')
      ) into reviewer_is_active;
      if not reviewer_is_active then
        raise exception using errcode = '42501', message = 'Assign an active QMSR reviewer before submission';
      end if;
    end if;
    return new;
  end if;

  if actor_role <> 'admin' and (
    new.id is distinct from old.id or
    new.submission_number is distinct from old.submission_number or
    new.created_by is distinct from old.created_by or
    new.created_at is distinct from old.created_at or
    new.approval_date is distinct from old.approval_date or
    new.closed_at is distinct from old.closed_at or
    new.archived_at is distinct from old.archived_at
  ) then
    raise exception using errcode = '42501', message = 'System managed submission fields cannot be changed by this role';
  end if;

  if actor_role = 'qms' then
    if old.created_by is distinct from auth.uid() then
      raise exception using errcode = '42501', message = 'QMS users can only edit their own submissions';
    end if;
    if old.status not in ('draft', 'need_revision') and
      (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks)
      is distinct from
      (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks) then
      raise exception using errcode = '42501', message = 'Submission metadata is locked at this workflow stage';
    end if;
  elsif actor_role in ('qms_section_head', 'qmsr') and
    (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks)
    is distinct from
    (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks) then
    raise exception using errcode = '42501', message = 'Reviewers cannot edit submission metadata';
  end if;

  if new.status is distinct from old.status and not public.can_transition_for_current_user(old.status, new.status, old.created_by, old.reviewer_id) then
    raise exception using errcode = '42501', message = 'This user is not authorized for the current workflow step';
  end if;

  if new.status in ('submitted', 'resubmitted') then
    select exists(
      select 1 from public.reviewers r
      join public.profiles p on p.id = r.id
      where r.id = new.reviewer_id and r.is_active and p.is_active and p.role in ('qmsr', 'admin')
    ) into reviewer_is_active;
    if not reviewer_is_active then
      raise exception using errcode = '42501', message = 'Assign an active QMSR reviewer before submission';
    end if;
  end if;

  if new.status in ('need_revision', 'rejected') and length(trim(coalesce(current_setting('app.review_note', true), ''))) = 0 then
    raise exception using errcode = '22023', message = 'Review note is required';
  end if;
  if new.status = 'approved' then
    new.approval_date := coalesce(new.approval_date, (now() at time zone 'Asia/Jakarta')::date);
  end if;
  if new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.transition_document(
  p_document_id uuid,
  p_new_status public.document_status,
  p_note text default null
)
returns public.document_submissions
language plpgsql security invoker set search_path = public
as $$
declare
  target public.document_submissions;
begin
  if auth.uid() is null or public.current_app_role() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_new_status in ('need_revision', 'rejected') and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception using errcode = '22023', message = 'Review note is required';
  end if;
  select * into target from public.document_submissions where id = p_document_id for update;
  if target.id is null then
    raise exception using errcode = '42501', message = 'Document not found or access denied';
  end if;
  if not public.can_transition_for_current_user(target.status, p_new_status, target.created_by, target.reviewer_id) then
    raise exception using errcode = '42501', message = 'This user is not authorized for the current workflow step';
  end if;
  perform set_config('app.review_note', coalesce(p_note, ''), true);
  update public.document_submissions set status = p_new_status where id = p_document_id returning * into target;
  return target;
end
$$;
revoke all on function public.transition_document(uuid, public.document_status, text) from public;
grant execute on function public.transition_document(uuid, public.document_status, text) to authenticated;

create or replace function public.log_document_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  event public.history_action;
begin
  if tg_op = 'INSERT' then
    insert into public.document_history(document_id,event_type,new_status,changed_by,reviewer_name,actor_role)
    values(new.id,'document_created',new.status,auth.uid(),(select full_name from public.profiles where id=auth.uid()),public.current_app_role());
    return new;
  elsif new.status is distinct from old.status then
    event := (case new.status
      when 'submitted' then 'submitted'
      when 'under_review' then 'review_started'
      when 'qmsr_review' then 'qmsr_review_started'
      when 'need_revision' then 'need_revision'
      when 'resubmitted' then 'resubmitted'
      when 'approved' then 'approved'
      when 'rejected' then 'rejected'
      when 'closed' then 'closed'
      else 'document_updated'
    end)::public.history_action;
    insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name,notes,actor_role)
    values(new.id,event,old.status,new.status,auth.uid(),(select full_name from public.profiles where id=auth.uid()),nullif(current_setting('app.review_note', true),''),public.current_app_role());
  elsif (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks)
    is distinct from
    (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks) then
    insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name,notes,actor_role)
    values(new.id,'document_updated',old.status,new.status,auth.uid(),(select full_name from public.profiles where id=auth.uid()),'Metadata dokumen diperbarui.',public.current_app_role());
  end if;
  return new;
end
$$;

create or replace function public.log_followup_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.document_history(document_id,event_type,changed_by,reviewer_name,notes,metadata,actor_role)
  values(new.document_id,'follow_up_added',auth.uid(),(select full_name from public.profiles where id=auth.uid()),new.follow_up_result,
    jsonb_build_object('follow_up_date',new.follow_up_date,'next_action',new.next_action),public.current_app_role());
  return new;
end
$$;

create or replace function public.archive_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare archived_document public.document_submissions;
begin
  if public.current_app_role() is distinct from 'admin'::public.app_role then
    raise exception using errcode = '42501', message = 'Only active admins can archive documents';
  end if;
  update public.document_submissions set archived_at = coalesce(archived_at, now())
  where id = p_document_id and archived_at is null returning * into archived_document;
  if archived_document.id is null then
    raise exception using errcode = 'P0002', message = 'Document not found or already archived';
  end if;
  insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name,actor_role)
  values(archived_document.id,'archived',archived_document.status,archived_document.status,
    auth.uid(),(select full_name from public.profiles where id=auth.uid()),public.current_app_role());
end
$$;
revoke all on function public.archive_document(uuid) from public;
grant execute on function public.archive_document(uuid) to authenticated;

drop policy if exists submissions_read_authenticated on public.document_submissions;
create policy submissions_read_authenticated on public.document_submissions for select to authenticated
using (public.can_view_submission(created_by, reviewer_id, status));

drop policy if exists submissions_create_submitter on public.document_submissions;
create policy submissions_create_submitter on public.document_submissions for insert to authenticated
with check ((public.current_app_role() = 'admin') or (public.current_app_role() = 'qms' and created_by = auth.uid()));

drop policy if exists submissions_update_roles on public.document_submissions;
create policy submissions_update_roles on public.document_submissions for update to authenticated
using (public.can_view_submission(created_by, reviewer_id, status))
with check (public.can_view_submission(created_by, reviewer_id, status));

drop policy if exists followups_create_roles on public.document_followups;
create policy followups_create_roles on public.document_followups for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.document_submissions d where d.id = document_id and
    (public.current_app_role() = 'admin' or
      (public.current_app_role() = 'qms' and d.created_by = auth.uid()) or
      (public.current_app_role() = 'qms_section_head' and d.status in ('submitted','resubmitted','under_review')) or
      (public.current_app_role() = 'qmsr' and d.reviewer_id = auth.uid() and d.status = 'qmsr_review'))
  )
);

drop policy if exists followups_update_creator_admin on public.document_followups;
create policy followups_update_creator_admin on public.document_followups for update to authenticated
using ((created_by = auth.uid() or public.current_app_role() = 'admin') and exists (
  select 1 from public.document_submissions d where d.id = document_id and public.can_view_submission(d.created_by,d.reviewer_id,d.status)
));

drop policy if exists attachments_add_roles on public.document_attachments;
create policy attachments_add_roles on public.document_attachments for insert to authenticated
with check (
  uploaded_by = auth.uid() and exists (
    select 1 from public.document_submissions d where d.id = document_id and
    (public.current_app_role() = 'admin' or
      (public.current_app_role() = 'qms' and d.created_by = auth.uid()) or
      (public.current_app_role() = 'qms_section_head' and d.status in ('submitted','resubmitted','under_review')) or
      (public.current_app_role() = 'qmsr' and d.reviewer_id = auth.uid() and d.status = 'qmsr_review'))
  )
);
