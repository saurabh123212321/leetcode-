
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'mentor', 'student');
CREATE TYPE public.tenant_plan AS ENUM ('free', 'pro', 'organization');
CREATE TYPE public.quiz_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.notification_type AS ENUM ('info', 'reminder', 'announcement', 'achievement', 'alert');

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan tenant_plan NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_seeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);

-- ============================================
-- USER_ROLES
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);

-- ============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_tenant(_user_id UUID, _tenant UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_mentor_of_tenant(_user_id UUID, _tenant UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant AND role IN ('mentor', 'admin', 'super_admin')
  )
$$;

-- ============================================
-- updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- WORKSPACES, FOLDERS, FILES
-- ============================================
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspaces_tenant ON public.workspaces(tenant_id);
CREATE INDEX idx_workspaces_user ON public.workspaces(created_by);

CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_folders_workspace ON public.folders(workspace_id);

CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_files_workspace ON public.files(workspace_id);
CREATE INDEX idx_files_tenant ON public.files(tenant_id);

CREATE TRIGGER trg_files_updated BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- NOTES
-- ============================================
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  topic TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_tenant ON public.notes(tenant_id);
CREATE INDEX idx_notes_user ON public.notes(created_by);
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- QUIZZES
-- ============================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty quiz_difficulty NOT NULL DEFAULT 'beginner',
  time_limit_minutes INT DEFAULT 30,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_tenant ON public.quizzes(tenant_id);

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  time_taken_seconds INT,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_attempts_tenant ON public.quiz_attempts(tenant_id);
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(created_by);

-- ============================================
-- CODING SUBMISSIONS
-- ============================================
CREATE TABLE public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  stdin TEXT,
  stdout TEXT,
  stderr TEXT,
  status TEXT,
  execution_time NUMERIC,
  memory_kb INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_tenant ON public.coding_submissions(tenant_id);
CREATE INDEX idx_submissions_user ON public.coding_submissions(created_by);

-- ============================================
-- AI CONVERSATIONS / MESSAGES
-- ============================================
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_conv_user ON public.ai_conversations(created_by);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_msg_conv ON public.ai_messages(conversation_id);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_user ON public.activity_logs(created_by);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type notification_type NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_recipient ON public.notifications(recipient_id);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  plan tenant_plan NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  ai_tokens_used BIGINT DEFAULT 0,
  storage_used_mb NUMERIC DEFAULT 0,
  monthly_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SUPPORT TICKETS
-- ============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE RLS ON EVERYTHING
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- TENANTS: super_admin sees all; others see own tenant
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR id = public.get_user_tenant(auth.uid())
);
CREATE POLICY tenants_modify ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- PROFILES: super_admin all; own tenant for admins; self for others
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
  OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_super_admin(auth.uid()));

-- USER_ROLES: read own/tenant scope; super_admin manages all
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY user_roles_modify ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_tenant(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_admin_of_tenant(auth.uid(), tenant_id));

-- Generic helper macro pattern: tenant_scoped_select + own/admin write
-- WORKSPACES
CREATE POLICY ws_select ON public.workspaces FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY ws_insert ON public.workspaces FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
CREATE POLICY ws_update ON public.workspaces FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY ws_delete ON public.workspaces FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);

-- FOLDERS
CREATE POLICY fld_select ON public.folders FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY fld_modify ON public.folders FOR ALL TO authenticated USING (
  tenant_id = public.get_user_tenant(auth.uid()) AND (created_by = auth.uid() OR public.is_mentor_of_tenant(auth.uid(), tenant_id))
) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- FILES
CREATE POLICY files_select ON public.files FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY files_insert ON public.files FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
CREATE POLICY files_update ON public.files FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.is_mentor_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY files_delete ON public.files FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);

-- NOTES
CREATE POLICY notes_select ON public.notes FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY notes_insert ON public.notes FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
CREATE POLICY notes_update ON public.notes FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.is_mentor_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY notes_delete ON public.notes FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);

-- QUIZZES
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY quizzes_modify ON public.quizzes FOR ALL TO authenticated USING (
  tenant_id = public.get_user_tenant(auth.uid()) AND (created_by = auth.uid() OR public.is_mentor_of_tenant(auth.uid(), tenant_id))
) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- QUIZ_ATTEMPTS
CREATE POLICY qa_select ON public.quiz_attempts FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.is_mentor_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY qa_insert ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);

-- CODING_SUBMISSIONS
CREATE POLICY cs_select ON public.coding_submissions FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.is_mentor_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY cs_insert ON public.coding_submissions FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);

-- AI CONVERSATIONS / MESSAGES
CREATE POLICY aic_select ON public.ai_conversations FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR created_by = auth.uid()
);
CREATE POLICY aic_modify ON public.ai_conversations FOR ALL TO authenticated USING (
  created_by = auth.uid()
) WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY aim_select ON public.ai_messages FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR created_by = auth.uid()
);
CREATE POLICY aim_insert ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND tenant_id = public.get_user_tenant(auth.uid())
);

-- ACTIVITY LOGS
CREATE POLICY activity_select ON public.activity_logs FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY activity_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
);

-- NOTIFICATIONS
CREATE POLICY notif_select ON public.notifications FOR SELECT TO authenticated USING (
  recipient_id = auth.uid() OR public.is_super_admin(auth.uid())
);
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated USING (
  recipient_id = auth.uid()
);
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
);

-- SUBSCRIPTIONS
CREATE POLICY sub_select ON public.subscriptions FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY sub_modify ON public.subscriptions FOR ALL TO authenticated USING (
  public.is_super_admin(auth.uid()) OR public.is_admin_of_tenant(auth.uid(), tenant_id)
) WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_admin_of_tenant(auth.uid(), tenant_id));

-- SUPPORT TICKETS
CREATE POLICY tickets_select ON public.support_tickets FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_of_tenant(auth.uid(), tenant_id)
);

-- ANNOUNCEMENTS
CREATE POLICY ann_select ON public.announcements FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR tenant_id = public.get_user_tenant(auth.uid())
);
CREATE POLICY ann_modify ON public.announcements FOR ALL TO authenticated USING (
  tenant_id = public.get_user_tenant(auth.uid()) AND public.is_mentor_of_tenant(auth.uid(), tenant_id)
) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
