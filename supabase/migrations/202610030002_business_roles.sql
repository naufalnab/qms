alter type public.app_role add value if not exists 'qms';
alter type public.app_role add value if not exists 'qms_section_head';
alter type public.app_role add value if not exists 'qmsr';

alter type public.document_status add value if not exists 'qmsr_review';
alter type public.history_action add value if not exists 'qmsr_review_started';
