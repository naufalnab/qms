create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','submitter','reviewer','viewer');
create type public.document_condition as enum ('new','existing');
create type public.document_priority as enum ('low','medium','high','critical');
create type public.document_status as enum ('draft','submitted','under_review','need_revision','resubmitted','approved','rejected','closed');
create type public.history_action as enum ('document_created','document_updated','submitted','review_started','need_revision','resubmitted','approved','rejected','closed','follow_up_added','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'submitter',
  department_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), name text not null unique, code text,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_department_fk foreign key(department_id) references public.departments(id) on delete set null;
create table public.document_types (
  id uuid primary key default gen_random_uuid(), name text not null unique, code text,
  default_sla_days integer not null check(default_sla_days > 0), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.reviewers (
  id uuid primary key references public.profiles(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.document_submissions (
  id uuid primary key default gen_random_uuid(), submission_number text not null unique,
  request_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  document_condition public.document_condition not null, department_id uuid not null references public.departments(id) on delete restrict,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  document_number text not null, document_title text not null, revision text not null,
  change_reason text not null default '', requestor_name text not null, reviewer_id uuid references public.reviewers(id) on delete set null,
  priority public.document_priority not null default 'medium', sla_days integer not null check(sla_days > 0), due_date date not null,
  status public.document_status not null default 'draft', approval_date date, closed_at timestamptz,
  remarks text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), archived_at timestamptz,
  constraint existing_change_reason check(document_condition <> 'existing' or length(trim(change_reason)) > 0)
);
create table public.document_history (
  id uuid primary key default gen_random_uuid(), document_id uuid not null references public.document_submissions(id) on delete cascade,
  event_type public.history_action not null, previous_status public.document_status, new_status public.document_status,
  notes text, changed_by uuid not null references public.profiles(id), reviewer_name text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.document_followups (
  id uuid primary key default gen_random_uuid(), document_id uuid not null references public.document_submissions(id) on delete cascade,
  follow_up_date date not null, follow_up_result text not null, next_action text not null,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.document_attachments (
  id uuid primary key default gen_random_uuid(), document_id uuid not null references public.document_submissions(id) on delete cascade,
  file_name text not null, storage_path text not null unique, file_type text not null, file_size bigint not null check(file_size <= 10485760),
  uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index submissions_request_date_idx on public.document_submissions(request_date desc);
create index submissions_status_due_idx on public.document_submissions(status,due_date);
create index submissions_department_idx on public.document_submissions(department_id);
create index submissions_type_idx on public.document_submissions(document_type_id);
create index submissions_reviewer_idx on public.document_submissions(reviewer_id);
create index submissions_search_idx on public.document_submissions using gin(to_tsvector('simple', coalesce(submission_number,'')||' '||coalesce(document_number,'')||' '||coalesce(document_title,'')||' '||coalesce(requestor_name,'')));
create index history_document_created_idx on public.document_history(document_id,created_at desc);
create index followups_document_date_idx on public.document_followups(document_id,follow_up_date desc);

create or replace function public.current_app_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and is_active $$;
create or replace function public.can_review() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_app_role() in ('admin','reviewer'),false) $$;
revoke all on function public.current_app_role() from public;
revoke all on function public.can_review() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.can_review() to authenticated;
create or replace function public.valid_status_transition(old_status public.document_status,new_status public.document_status) returns boolean language sql immutable as $$
  select case old_status when 'draft' then new_status='submitted' when 'submitted' then new_status='under_review' when 'under_review' then new_status in ('need_revision','approved','rejected') when 'need_revision' then new_status='resubmitted' when 'resubmitted' then new_status='under_review' when 'approved' then new_status='closed' else false end
$$;
create or replace function public.enforce_document_workflow() returns trigger language plpgsql security definer set search_path=public as $$
declare actor_role public.app_role;
begin
 actor_role=public.current_app_role();
 if tg_op='INSERT' then
  if new.created_by is distinct from auth.uid() and actor_role <> 'admin' then raise exception 'Cannot create a submission for another user'; end if;
  return new;
 end if;
 if actor_role='reviewer' and (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks,new.created_by) is distinct from (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks,old.created_by) then raise exception 'Reviewer cannot edit submission metadata'; end if;
 if actor_role='submitter' then
  if old.created_by is distinct from auth.uid() then raise exception 'Submitters can only edit their own submissions'; end if;
  if old.status not in ('draft','need_revision') and (new.document_condition,new.department_id,new.document_type_id,new.document_number,new.document_title,new.revision,new.change_reason,new.requestor_name,new.reviewer_id,new.priority,new.sla_days,new.due_date,new.request_date,new.remarks) is distinct from (old.document_condition,old.department_id,old.document_type_id,old.document_number,old.document_title,old.revision,old.change_reason,old.requestor_name,old.reviewer_id,old.priority,old.sla_days,old.due_date,old.request_date,old.remarks) then raise exception 'Submission metadata is locked at this workflow stage'; end if;
  if new.status is distinct from old.status and new.status not in ('submitted','resubmitted') then raise exception 'Submitter cannot perform reviewer actions'; end if;
 end if;
 if tg_op='UPDATE' and new.status is distinct from old.status then
  if not public.valid_status_transition(old.status,new.status) then raise exception 'Invalid QMS status transition: % -> %',old.status,new.status; end if;
  if new.status in ('under_review','need_revision','approved','rejected') and not public.can_review() then raise exception 'Reviewer permission required'; end if;
  if new.status in ('need_revision','rejected') and length(trim(coalesce(current_setting('app.review_note',true),'')))=0 then raise exception 'Review note is required'; end if;
  if new.status='approved' then new.approval_date=coalesce(new.approval_date,(now() at time zone 'Asia/Jakarta')::date); end if;
  if new.status='closed' then new.closed_at=coalesce(new.closed_at,now()); end if;
 end if;
 new.updated_at=now(); return new;
end $$;
create trigger document_workflow_guard before update on public.document_submissions for each row execute function public.enforce_document_workflow();
create or replace function public.transition_document(p_document_id uuid,p_new_status public.document_status,p_note text default null) returns public.document_submissions language plpgsql security invoker set search_path=public as $$
declare target public.document_submissions;
begin
 if p_new_status in ('need_revision','rejected') and length(trim(coalesce(p_note,'')))=0 then raise exception 'Review note is required'; end if;
 perform set_config('app.review_note',coalesce(p_note,''),true);
 update public.document_submissions set status=p_new_status where id=p_document_id returning * into target;
 if target.id is null then raise exception 'Document not found or access denied'; end if;
 return target;
end $$;
revoke all on function public.transition_document(uuid,public.document_status,text) from public;
grant execute on function public.transition_document(uuid,public.document_status,text) to authenticated;
create or replace function public.generate_submission_number() returns trigger language plpgsql as $$ declare next_num integer; begin
 if new.submission_number is null or new.submission_number='' then
  perform pg_advisory_xact_lock(hashtext('qms-submission-'||extract(year from new.request_date)::int));
  select coalesce(max(split_part(submission_number,'-',3)::int),0)+1 into next_num from public.document_submissions where submission_number like 'QMS-'||extract(year from new.request_date)::int||'-%';
  new.submission_number=format('QMS-%s-%s',extract(year from new.request_date)::int,lpad(next_num::text,4,'0'));
 end if; return new;
end $$;
create trigger submission_number_trigger before insert on public.document_submissions for each row execute function public.generate_submission_number();
create or replace function public.log_document_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_op='INSERT' then insert into public.document_history(document_id,event_type,new_status,changed_by) values(new.id,'document_created',new.status,auth.uid()); return new;
 elsif new.status is distinct from old.status then
  insert into public.document_history(document_id,event_type,previous_status,new_status,changed_by,reviewer_name,notes)
  values(new.id,case new.status when 'submitted' then 'submitted' when 'under_review' then 'review_started' when 'need_revision' then 'need_revision' when 'resubmitted' then 'resubmitted' when 'approved' then 'approved' when 'rejected' then 'rejected' when 'closed' then 'closed' else 'document_updated' end,old.status,new.status,auth.uid(),(select full_name from public.profiles where id=auth.uid()),nullif(current_setting('app.review_note',true),''));
 end if; return new;
end $$;
create trigger document_history_trigger after insert or update on public.document_submissions for each row execute function public.log_document_change();
create or replace function public.log_followup_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.document_history(document_id,event_type,changed_by,notes,metadata)
 values(new.document_id,'follow_up_added',auth.uid(),new.follow_up_result,jsonb_build_object('follow_up_date',new.follow_up_date,'next_action',new.next_action));
 return new;
end $$;
create trigger followup_history_trigger after insert on public.document_followups for each row execute function public.log_followup_change();
create or replace function public.prevent_history_mutation() returns trigger language plpgsql as $$ begin raise exception 'Document history is immutable'; end $$;
create trigger history_immutable before update or delete on public.document_history for each row execute function public.prevent_history_mutation();

alter table public.profiles enable row level security; alter table public.departments enable row level security; alter table public.document_types enable row level security;
alter table public.reviewers enable row level security; alter table public.document_submissions enable row level security; alter table public.document_history enable row level security;
alter table public.document_followups enable row level security; alter table public.document_attachments enable row level security;
create policy profiles_read_authenticated on public.profiles for select to authenticated using(true);
create policy profiles_admin_manage on public.profiles for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy departments_read_authenticated on public.departments for select to authenticated using(true);
create policy departments_admin_manage on public.departments for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy document_types_read_authenticated on public.document_types for select to authenticated using(true);
create policy document_types_admin_manage on public.document_types for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy reviewers_read_authenticated on public.reviewers for select to authenticated using(true);
create policy reviewers_admin_manage on public.reviewers for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy submissions_read_authenticated on public.document_submissions for select to authenticated using(public.current_app_role()='admin' or public.current_app_role()='viewer' or created_by=auth.uid() or reviewer_id=auth.uid());
create policy submissions_create_submitter on public.document_submissions for insert to authenticated with check(public.current_app_role() in ('admin','submitter') and created_by=auth.uid());
create policy submissions_update_roles on public.document_submissions for update to authenticated using(public.current_app_role()='admin' or (public.current_app_role()='submitter' and created_by=auth.uid()) or (public.current_app_role()='reviewer' and reviewer_id=auth.uid())) with check(public.current_app_role() in ('admin','submitter','reviewer'));
create policy history_read_accessible on public.document_history for select to authenticated using(exists(select 1 from public.document_submissions d where d.id=document_id));
revoke insert,update,delete on public.document_history from authenticated;
create policy followups_read_accessible on public.document_followups for select to authenticated using(exists(select 1 from public.document_submissions d where d.id=document_id));
create policy followups_create_roles on public.document_followups for insert to authenticated with check(created_by=auth.uid() and public.current_app_role() in ('admin','submitter','reviewer') and exists(select 1 from public.document_submissions d where d.id=document_id and (public.current_app_role()='admin' or d.created_by=auth.uid() or d.reviewer_id=auth.uid())));
create policy followups_update_creator_admin on public.document_followups for update to authenticated using((created_by=auth.uid() or public.current_app_role()='admin') and exists(select 1 from public.document_submissions d where d.id=document_id and (public.current_app_role()='admin' or d.created_by=auth.uid() or d.reviewer_id=auth.uid())));
create policy attachments_read_accessible on public.document_attachments for select to authenticated using(exists(select 1 from public.document_submissions d where d.id=document_id));
create policy attachments_add_roles on public.document_attachments for insert to authenticated with check(uploaded_by=auth.uid() and public.current_app_role() in ('admin','submitter','reviewer') and exists(select 1 from public.document_submissions d where d.id=document_id and (public.current_app_role()='admin' or d.created_by=auth.uid() or d.reviewer_id=auth.uid())));
create policy attachments_remove_admin on public.document_attachments for delete to authenticated using(public.current_app_role()='admin');

insert into public.departments(name) values ('QMS'),('QC'),('Production'),('Warehouse'),('Purchasing NRM'),('HRM'),('Maintenance'),('Finance'),('QA'),('PPIC'),('RND'),('Purchasing RM'),('EXIM'),('Marketing'),('Spec'),('General Affair'),('House Keeping'),('Cold Storage'),('LAB'),('WHS'),('HSE'),('ENG') on conflict(name) do nothing;
insert into public.document_types(name,code,default_sla_days) values ('Form','FORM',3),('WI','WI',5),('SOP','SOP',7),('Policy','POL',10),('External Document','EXT',5),('Other','OTH',7) on conflict(name) do nothing;
