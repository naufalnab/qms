drop policy if exists profiles_admin_manage on public.profiles;
drop policy if exists departments_admin_manage on public.departments;
drop policy if exists document_types_admin_manage on public.document_types;
drop policy if exists reviewers_admin_manage on public.reviewers;
drop policy if exists submissions_read_authenticated on public.document_submissions;
drop policy if exists submissions_create_submitter on public.document_submissions;
drop policy if exists submissions_update_roles on public.document_submissions;
drop policy if exists followups_create_roles on public.document_followups;
drop policy if exists followups_update_creator_admin on public.document_followups;
drop policy if exists attachments_add_roles on public.document_attachments;
drop policy if exists attachments_remove_admin on public.document_attachments;

drop trigger if exists document_workflow_guard on public.document_submissions;
drop function if exists public.enforce_document_workflow();
drop function if exists public.archive_document(uuid);
drop function if exists public.can_review();
drop function if exists public.current_app_role();

alter table public.profiles alter column role drop default;
create type public.app_role_clean as enum ('admin', 'qms', 'qms_section_head', 'qmsr');
alter table public.profiles alter column role type public.app_role_clean using role::text::public.app_role_clean;
drop type public.app_role;
alter type public.app_role_clean rename to app_role;
alter table public.profiles alter column role set default 'qms';

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and is_active $$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.can_review()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() in ('admin', 'qms_section_head', 'qmsr'), false) $$;
revoke all on function public.can_review() from public;
grant execute on function public.can_review() to authenticated;

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
create trigger document_workflow_guard before update on public.document_submissions
for each row execute function public.enforce_document_workflow();

create or replace function public.archive_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare archived_document public.document_submissions;
begin
  if public.current_app_role() is distinct from 'admin'::public.app_role then
    raise exception 'Only active admins can delete documents';
  end if;
  update public.document_submissions set archived_at = coalesce(archived_at, now())
  where id = p_document_id and archived_at is null returning * into archived_document;
  if archived_document.id is null then
    raise exception 'Document not found or already deleted';
  end if;
  insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name)
  values(archived_document.id,'archived',archived_document.status,archived_document.status,
    auth.uid(),(select full_name from public.profiles where id=auth.uid()));
end
$$;
revoke all on function public.archive_document(uuid) from public;
grant execute on function public.archive_document(uuid) to authenticated;

create policy profiles_admin_manage on public.profiles for all to authenticated
using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy departments_admin_manage on public.departments for all to authenticated
using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy document_types_admin_manage on public.document_types for all to authenticated
using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy reviewers_admin_manage on public.reviewers for all to authenticated
using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy submissions_read_authenticated on public.document_submissions for select to authenticated
using(public.current_app_role() in ('admin','qms_section_head') or created_by=auth.uid() or reviewer_id=auth.uid());
create policy submissions_create_submitter on public.document_submissions for insert to authenticated
with check(public.current_app_role() in ('admin','qms') and created_by=auth.uid());
create policy submissions_update_roles on public.document_submissions for update to authenticated
using(public.current_app_role() in ('admin','qms_section_head') or (public.current_app_role()='qms' and created_by=auth.uid()) or (public.current_app_role()='qmsr' and reviewer_id=auth.uid()))
with check(public.current_app_role() in ('admin','qms','qms_section_head','qmsr'));
create policy followups_create_roles on public.document_followups for insert to authenticated
with check(created_by=auth.uid() and public.current_app_role() in ('admin','qms','qms_section_head','qmsr') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));
create policy followups_update_creator_admin on public.document_followups for update to authenticated
using((created_by=auth.uid() or public.current_app_role()='admin') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));
create policy attachments_add_roles on public.document_attachments for insert to authenticated
with check(uploaded_by=auth.uid() and public.current_app_role() in ('admin','qms','qms_section_head','qmsr') and exists(
  select 1 from public.document_submissions d where d.id=document_id and
  (public.current_app_role() in ('admin','qms_section_head') or d.created_by=auth.uid() or d.reviewer_id=auth.uid())
));
create policy attachments_remove_admin on public.document_attachments for delete to authenticated
using(public.current_app_role()='admin');
