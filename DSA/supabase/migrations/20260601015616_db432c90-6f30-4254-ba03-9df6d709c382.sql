-- A: color tags on files & folders
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS color_tag text;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS color_tag text;
ALTER TABLE public.files ADD CONSTRAINT files_color_tag_chk CHECK (color_tag IS NULL OR color_tag IN ('red','yellow','green','blue','purple'));
ALTER TABLE public.folders ADD CONSTRAINT folders_color_tag_chk CHECK (color_tag IS NULL OR color_tag IN ('red','yellow','green','blue','purple'));
CREATE INDEX IF NOT EXISTS files_color_tag_idx ON public.files(tenant_id, color_tag);
CREATE INDEX IF NOT EXISTS folders_color_tag_idx ON public.folders(tenant_id, color_tag);

-- C: timed practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  duration_seconds integer NOT NULL,
  problem_ids uuid[] NOT NULL DEFAULT '{}',
  file_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ai_score numeric,
  ai_feedback text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_select ON public.practice_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_super_admin(auth.uid()));
CREATE POLICY ps_insert ON public.practice_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id = private.get_user_tenant(auth.uid()));
CREATE POLICY ps_update ON public.practice_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- D: cache for LeetCode-API responses
CREATE TABLE IF NOT EXISTS public.leetcode_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leetcode_cache TO anon, authenticated;
GRANT ALL ON public.leetcode_cache TO service_role;
ALTER TABLE public.leetcode_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY lc_select ON public.leetcode_cache FOR SELECT TO anon, authenticated USING (true);