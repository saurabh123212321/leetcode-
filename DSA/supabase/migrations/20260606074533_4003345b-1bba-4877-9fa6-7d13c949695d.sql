
CREATE TABLE public.cw_questions (
  id INT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  acceptance NUMERIC,
  frequency_max NUMERIC,
  companies TEXT[] NOT NULL DEFAULT '{}',
  company_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cw_questions TO authenticated, anon;
GRANT ALL ON public.cw_questions TO service_role;
ALTER TABLE public.cw_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw_questions readable" ON public.cw_questions FOR SELECT USING (true);
CREATE INDEX cw_questions_difficulty_idx ON public.cw_questions(difficulty);
CREATE INDEX cw_questions_companies_idx ON public.cw_questions USING GIN(companies);
CREATE INDEX cw_questions_title_lower_idx ON public.cw_questions(lower(title));
