-- ARCTOR_ADM2A_APPLY_V1
-- Run ONLY after 01_PRECHECK returned PASS. Transactional DDL, no automatic agents.
-- Current application code will not use this schema until ADM-2B integration.
BEGIN;
DO $guard$
BEGIN
  IF to_regclass('public.app_users') IS NULL
    OR to_regclass('public.platform_admins') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')
  THEN RAISE EXCEPTION 'ADM2A_STOP_PREREQUISITES'; END IF;
  IF to_regclass('public.arctor_admin_roles_adm2_v1') IS NOT NULL
    OR to_regclass('public.arctor_admin_cases_adm2_v1') IS NOT NULL
    OR to_regclass('public.arctor_admin_assignments_adm2_v1') IS NOT NULL
    OR to_regclass('public.arctor_admin_case_events_adm2_v1') IS NOT NULL
  THEN RAISE EXCEPTION 'ADM2A_STOP_ALREADY_INSTALLED'; END IF;
END $guard$;

CREATE TABLE public.arctor_admin_roles_adm2_v1 (
  role_code text PRIMARY KEY,
  title_ru text NOT NULL,
  manager_title_ru text NOT NULL,
  responsibility_summary_ru text NOT NULL,
  instruction_reference text NULL,
  is_active boolean NOT NULL DEFAULT true,
  agent_execution_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adm2a_role_code_format CHECK(role_code ~ '^[a-z][a-z0-9_]{1,40}$'),
  CONSTRAINT adm2a_role_title_present CHECK(length(btrim(title_ru)) > 0)
);

CREATE TABLE public.arctor_admin_cases_adm2_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  case_type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'triage',
  owner_role_code text NOT NULL REFERENCES public.arctor_admin_roles_adm2_v1(role_code),
  source_system text NOT NULL DEFAULT 'manual',
  source_entity_kind text NULL,
  source_external_id text NULL,
  source_path text NULL,
  next_expected_result text NULL,
  created_by_app_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,
  CONSTRAINT adm2a_case_code_format CHECK(case_code ~ '^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$'),
  CONSTRAINT adm2a_case_type CHECK(case_type IN ('defect','research','planned','operations','risk','request','incident')),
  CONSTRAINT adm2a_case_priority CHECK(priority IN ('urgent','high','normal','low')),
  CONSTRAINT adm2a_case_status CHECK(status IN ('triage','open','assigned','in_progress','blocked','review','resolved','closed','cancelled')),
  CONSTRAINT adm2a_case_title_nonblank CHECK(length(btrim(title)) BETWEEN 3 AND 240),
  CONSTRAINT adm2a_case_description_size CHECK(length(description) <= 12000),
  CONSTRAINT adm2a_case_source_nonblank CHECK(length(btrim(source_system)) BETWEEN 2 AND 80),
  CONSTRAINT adm2a_case_source_external_nonblank CHECK(source_external_id IS NULL OR length(btrim(source_external_id)) > 0),
  CONSTRAINT adm2a_case_closed_consistency CHECK((status='closed') = (closed_at IS NOT NULL))
);
CREATE UNIQUE INDEX arctor_admin_cases_adm2_source_uidx
  ON public.arctor_admin_cases_adm2_v1(source_system, source_entity_kind, source_external_id)
  WHERE source_external_id IS NOT NULL AND source_entity_kind IS NOT NULL;
CREATE INDEX arctor_admin_cases_adm2_owner_status_idx
  ON public.arctor_admin_cases_adm2_v1(owner_role_code, status, priority, created_at DESC);

CREATE TABLE public.arctor_admin_assignments_adm2_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.arctor_admin_cases_adm2_v1(id) ON DELETE RESTRICT,
  recipient_role_code text NOT NULL REFERENCES public.arctor_admin_roles_adm2_v1(role_code),
  recipient_app_user_id uuid NULL,
  recipient_agent_code text NULL,
  assignment_text text NOT NULL,
  required_result text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_by_app_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  completed_at timestamptz NULL,
  CONSTRAINT adm2a_assignment_status CHECK(status IN ('new','accepted','in_progress','blocked','reported','completed','declined','cancelled')),
  CONSTRAINT adm2a_assignment_text_present CHECK(length(btrim(assignment_text)) BETWEEN 4 AND 12000),
  CONSTRAINT adm2a_assignment_result_present CHECK(length(btrim(required_result)) BETWEEN 4 AND 6000),
  CONSTRAINT adm2a_assignment_one_recipient CHECK(NOT (recipient_app_user_id IS NOT NULL AND recipient_agent_code IS NOT NULL)),
  CONSTRAINT adm2a_assignment_case_pair UNIQUE(id,case_id)
);
CREATE INDEX arctor_admin_assignments_adm2_inbox_idx
  ON public.arctor_admin_assignments_adm2_v1(recipient_role_code,status,created_at DESC);
CREATE UNIQUE INDEX arctor_admin_assignments_adm2_open_per_role_uidx
  ON public.arctor_admin_assignments_adm2_v1(case_id,recipient_role_code)
  WHERE status IN ('new','accepted','in_progress','blocked');

CREATE TABLE public.arctor_admin_case_events_adm2_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.arctor_admin_cases_adm2_v1(id) ON DELETE RESTRICT,
  assignment_id uuid NULL,
  event_kind text NOT NULL,
  performed_by_type text NOT NULL,
  performed_by_app_user_id uuid NULL,
  performed_by_agent_code text NULL,
  result_summary text NULL,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adm2a_event_assignment_case_fk FOREIGN KEY (assignment_id,case_id)
    REFERENCES public.arctor_admin_assignments_adm2_v1(id,case_id),
  CONSTRAINT adm2a_event_kind CHECK(event_kind IN
    ('created','classified','assigned','accepted','work_note','report_submitted',
     'approval_requested','approved','rejected','handed_off','blocked','resolved',
     'closed','reopened','attachment_registered')),
  CONSTRAINT adm2a_event_actor_type CHECK(performed_by_type IN ('system','admin','agent')),
  CONSTRAINT adm2a_event_details_object CHECK(jsonb_typeof(details_json)='object'),
  CONSTRAINT adm2a_event_details_size CHECK(octet_length(details_json::text)<=32768)
);
CREATE INDEX arctor_admin_case_events_adm2_history_idx
  ON public.arctor_admin_case_events_adm2_v1(case_id,occurred_at DESC,id);

INSERT INTO public.arctor_admin_roles_adm2_v1
  (role_code,title_ru,manager_title_ru,responsibility_summary_ru)
VALUES
('process','Управление процессами','Руководитель процессов / диспетчер','Прием дел, распределение, отслеживание срока и эскалация'),
('product','Управление продуктом','Руководитель продукта','Требования, ценность, приоритеты и приемка'),
('semantic','Семантическая модель','Главный куратор модели','ОН, типовые активности, параметры, связи, последствия'),
('ai','ИИ и инструкции','Руководитель ИИ-направления','Инструкции моделей, качество, стоимость и маршруты ИИ'),
('engineering','Разработка и эксплуатация','Технический руководитель','Код, SQL, безопасность, сборки, развертывания'),
('quality','Качество и контроль','Руководитель качества','Тесты, проверка, выпуск и аудит'),
('commercial','Коммерческие операции','Руководитель коммерческого направления','Предприятия, покупки, сертификаты и POINTS'),
('support','Пользователи и поддержка','Руководитель поддержки','Запросы пользователей, помощь, локализация, доступ');

-- All four tables: no browser RLS policies and no browser table grants.
ALTER TABLE public.arctor_admin_roles_adm2_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arctor_admin_cases_adm2_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arctor_admin_assignments_adm2_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arctor_admin_case_events_adm2_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.arctor_admin_roles_adm2_v1,
 public.arctor_admin_cases_adm2_v1,
 public.arctor_admin_assignments_adm2_v1,
 public.arctor_admin_case_events_adm2_v1
 FROM PUBLIC,anon,authenticated;
-- The future authenticated admin-only Next.js server API is the ONLY DB client.
GRANT SELECT ON public.arctor_admin_roles_adm2_v1 TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.arctor_admin_cases_adm2_v1,
 public.arctor_admin_assignments_adm2_v1 TO service_role;
GRANT SELECT,INSERT ON public.arctor_admin_case_events_adm2_v1 TO service_role;
-- No automated agent execution is enabled and existing instructions are untouched.
COMMIT;
