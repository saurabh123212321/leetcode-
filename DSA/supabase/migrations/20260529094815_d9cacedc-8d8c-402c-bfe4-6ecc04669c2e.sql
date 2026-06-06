CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION private.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION private.is_admin_of_tenant(_user_id UUID, _tenant UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION private.is_mentor_of_tenant(_user_id UUID, _tenant UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant AND role IN ('mentor', 'admin', 'super_admin')
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_of_tenant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_mentor_of_tenant(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS tenants_modify ON public.tenants;
CREATE POLICY tenants_modify ON public.tenants FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid())
  OR id = auth.uid()
  OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR private.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR private.is_super_admin(auth.uid())
  OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS user_roles_modify ON public.user_roles;
CREATE POLICY user_roles_modify ON public.user_roles FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()) OR private.is_admin_of_tenant(auth.uid(), tenant_id))
  WITH CHECK (private.is_super_admin(auth.uid()) OR private.is_admin_of_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS ws_select ON public.workspaces;
CREATE POLICY ws_select ON public.workspaces FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS ws_insert ON public.workspaces;
CREATE POLICY ws_insert ON public.workspaces FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
DROP POLICY IF EXISTS ws_update ON public.workspaces;
CREATE POLICY ws_update ON public.workspaces FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS ws_delete ON public.workspaces;
CREATE POLICY ws_delete ON public.workspaces FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);

DROP POLICY IF EXISTS fld_select ON public.folders;
CREATE POLICY fld_select ON public.folders FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS fld_modify ON public.folders;
CREATE POLICY fld_modify ON public.folders FOR ALL TO authenticated USING (
  tenant_id = private.get_user_tenant(auth.uid()) AND (created_by = auth.uid() OR private.is_mentor_of_tenant(auth.uid(), tenant_id))
) WITH CHECK (tenant_id = private.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS files_select ON public.files;
CREATE POLICY files_select ON public.files FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS files_insert ON public.files;
CREATE POLICY files_insert ON public.files FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
DROP POLICY IF EXISTS files_update ON public.files;
CREATE POLICY files_update ON public.files FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR private.is_mentor_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS files_delete ON public.files;
CREATE POLICY files_delete ON public.files FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);

DROP POLICY IF EXISTS notes_select ON public.notes;
CREATE POLICY notes_select ON public.notes FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS notes_insert ON public.notes;
CREATE POLICY notes_insert ON public.notes FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
DROP POLICY IF EXISTS notes_update ON public.notes;
CREATE POLICY notes_update ON public.notes FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR private.is_mentor_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS notes_delete ON public.notes;
CREATE POLICY notes_delete ON public.notes FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);

DROP POLICY IF EXISTS quizzes_select ON public.quizzes;
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS quizzes_modify ON public.quizzes;
CREATE POLICY quizzes_modify ON public.quizzes FOR ALL TO authenticated USING (
  tenant_id = private.get_user_tenant(auth.uid()) AND (created_by = auth.uid() OR private.is_mentor_of_tenant(auth.uid(), tenant_id))
) WITH CHECK (tenant_id = private.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS qa_select ON public.quiz_attempts;
CREATE POLICY qa_select ON public.quiz_attempts FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR private.is_mentor_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS qa_insert ON public.quiz_attempts;
CREATE POLICY qa_insert ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);

DROP POLICY IF EXISTS cs_select ON public.coding_submissions;
CREATE POLICY cs_select ON public.coding_submissions FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR private.is_mentor_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS cs_insert ON public.coding_submissions;
CREATE POLICY cs_insert ON public.coding_submissions FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);

DROP POLICY IF EXISTS aic_select ON public.ai_conversations;
CREATE POLICY aic_select ON public.ai_conversations FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR created_by = auth.uid()
);
DROP POLICY IF EXISTS aic_modify ON public.ai_conversations;
CREATE POLICY aic_modify ON public.ai_conversations FOR ALL TO authenticated USING (
  created_by = auth.uid()
) WITH CHECK (created_by = auth.uid() AND tenant_id = private.get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS aim_select ON public.ai_messages;
CREATE POLICY aim_select ON public.ai_messages FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR created_by = auth.uid()
);
DROP POLICY IF EXISTS aim_insert ON public.ai_messages;
CREATE POLICY aim_insert ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND tenant_id = private.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS activity_select ON public.activity_logs;
CREATE POLICY activity_select ON public.activity_logs FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS activity_insert ON public.activity_logs;
CREATE POLICY activity_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS notif_select ON public.notifications;
CREATE POLICY notif_select ON public.notifications FOR SELECT TO authenticated USING (
  recipient_id = auth.uid() OR private.is_super_admin(auth.uid())
);
DROP POLICY IF EXISTS notif_update ON public.notifications;
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated USING (
  recipient_id = auth.uid()
);
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid())
);

DROP POLICY IF EXISTS sub_select ON public.subscriptions;
CREATE POLICY sub_select ON public.subscriptions FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS sub_modify ON public.subscriptions;
CREATE POLICY sub_modify ON public.subscriptions FOR ALL TO authenticated USING (
  private.is_super_admin(auth.uid()) OR private.is_admin_of_tenant(auth.uid(), tenant_id)
) WITH CHECK (private.is_super_admin(auth.uid()) OR private.is_admin_of_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS tickets_select ON public.support_tickets;
CREATE POLICY tickets_select ON public.support_tickets FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS tickets_insert ON public.support_tickets;
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (
  tenant_id = private.get_user_tenant(auth.uid()) AND created_by = auth.uid()
);
DROP POLICY IF EXISTS tickets_update ON public.support_tickets;
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR private.is_admin_of_tenant(auth.uid(), tenant_id)
);

DROP POLICY IF EXISTS ann_select ON public.announcements;
CREATE POLICY ann_select ON public.announcements FOR SELECT TO authenticated USING (
  private.is_super_admin(auth.uid()) OR tenant_id = private.get_user_tenant(auth.uid())
);
DROP POLICY IF EXISTS ann_modify ON public.announcements;
CREATE POLICY ann_modify ON public.announcements FOR ALL TO authenticated USING (
  tenant_id = private.get_user_tenant(auth.uid()) AND private.is_mentor_of_tenant(auth.uid(), tenant_id)
) WITH CHECK (tenant_id = private.get_user_tenant(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_of_tenant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_mentor_of_tenant(uuid, uuid) FROM PUBLIC, anon, authenticated;