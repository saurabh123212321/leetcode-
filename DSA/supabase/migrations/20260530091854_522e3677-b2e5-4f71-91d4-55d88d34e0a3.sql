-- V2: LeetCode-style problems
CREATE TYPE public.problem_difficulty AS ENUM ('easy','medium','hard');
CREATE TYPE public.submission_status AS ENUM ('pending','accepted','wrong_answer','runtime_error','compile_error','tle','mle');

CREATE TABLE public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  difficulty public.problem_difficulty NOT NULL DEFAULT 'easy',
  tags text[] NOT NULL DEFAULT '{}',
  constraints text,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  starter_code jsonb NOT NULL DEFAULT '{}'::jsonb,
  hints text[] NOT NULL DEFAULT '{}',
  editorial text,
  time_limit_ms integer NOT NULL DEFAULT 2000,
  memory_limit_kb integer NOT NULL DEFAULT 128000,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.problem_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  stdin text NOT NULL DEFAULT '',
  expected_stdout text NOT NULL DEFAULT '',
  is_sample boolean NOT NULL DEFAULT false,
  ordinal integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_problem_tests_problem ON public.problem_tests(problem_id, ordinal);

CREATE TABLE public.problem_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid,
  language text NOT NULL,
  code text NOT NULL,
  status public.submission_status NOT NULL DEFAULT 'pending',
  passed_tests integer NOT NULL DEFAULT 0,
  total_tests integer NOT NULL DEFAULT 0,
  runtime_ms numeric,
  memory_kb integer,
  failure_detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_user ON public.problem_submissions(user_id, created_at DESC);
CREATE INDEX idx_subs_problem ON public.problem_submissions(problem_id, created_at DESC);

GRANT SELECT ON public.problems TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.problems TO authenticated;
GRANT ALL ON public.problems TO service_role;

GRANT SELECT ON public.problem_tests TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.problem_tests TO authenticated;
GRANT ALL ON public.problem_tests TO service_role;

GRANT SELECT, INSERT ON public.problem_submissions TO authenticated;
GRANT ALL ON public.problem_submissions TO service_role;

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_submissions ENABLE ROW LEVEL SECURITY;

-- problems: published readable by all; admins/super_admins manage
CREATE POLICY problems_select_public ON public.problems FOR SELECT
  USING (is_published = true OR private.is_super_admin(auth.uid()));
CREATE POLICY problems_modify_admin ON public.problems FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'));

-- tests: only sample tests visible to regular users; admins see all
CREATE POLICY tests_select_sample ON public.problem_tests FOR SELECT TO authenticated
  USING (is_sample = true OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY tests_modify_admin ON public.problem_tests FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'));

-- submissions: users see own; admins see all
CREATE POLICY subs_select_own ON public.problem_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY subs_insert_own ON public.problem_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER problems_set_updated_at BEFORE UPDATE ON public.problems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a few starter problems
INSERT INTO public.problems (slug, title, difficulty, description, constraints, examples, starter_code, hints, tags) VALUES
('two-sum','Two Sum','easy',
'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

Read the array from stdin: first line is space-separated integers, second line is the target. Print the two indices space-separated.',
'2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9',
'[{"input":"2 7 11 15\n9","output":"0 1"},{"input":"3 2 4\n6","output":"1 2"}]'::jsonb,
'{"python":"import sys\nnums=list(map(int,sys.stdin.readline().split()))\ntarget=int(sys.stdin.readline())\n# your code here\n","javascript":"const lines=require(''fs'').readFileSync(0,''utf8'').split(''\\n'');\nconst nums=lines[0].split('' '').map(Number);\nconst target=Number(lines[1]);\n// your code here\n"}'::jsonb,
ARRAY['Try a hash map for O(n).','For each x, check if target-x is in the map.'],
ARRAY['array','hash-table']),
('reverse-string','Reverse String','easy',
'Read a string from stdin and print it reversed.',
'1 <= s.length <= 10^5',
'[{"input":"hello","output":"olleh"}]'::jsonb,
'{"python":"s=input()\n# print reversed\n","javascript":"const s=require(''fs'').readFileSync(0,''utf8'').trim();\n// console.log reversed\n"}'::jsonb,
ARRAY['Python: s[::-1]','JS: [...s].reverse().join("")'],
ARRAY['string','two-pointers']),
('fizzbuzz','FizzBuzz','easy',
'Read integer n. Print numbers 1..n, replacing multiples of 3 with Fizz, 5 with Buzz, both with FizzBuzz.',
'1 <= n <= 10^4',
'[{"input":"5","output":"1\n2\nFizz\n4\nBuzz"}]'::jsonb,
'{"python":"n=int(input())\n","javascript":"const n=Number(require(''fs'').readFileSync(0,''utf8''));\n"}'::jsonb,
ARRAY['Use modulo.'],
ARRAY['math']);

WITH p AS (SELECT id, slug FROM public.problems)
INSERT INTO public.problem_tests (problem_id, stdin, expected_stdout, is_sample, ordinal)
SELECT p.id, t.stdin, t.expected_stdout, t.is_sample, t.ordinal FROM p JOIN (VALUES
  ('two-sum','2 7 11 15
9','0 1', true, 0),
  ('two-sum','3 2 4
6','1 2', true, 1),
  ('two-sum','3 3
6','0 1', false, 2),
  ('two-sum','-1 -2 -3 -4 -5
-8','2 4', false, 3),
  ('reverse-string','hello','olleh', true, 0),
  ('reverse-string','a','a', false, 1),
  ('reverse-string','racecar','racecar', false, 2),
  ('fizzbuzz','5','1
2
Fizz
4
Buzz', true, 0),
  ('fizzbuzz','15','1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz', false, 1)
) AS t(slug, stdin, expected_stdout, is_sample, ordinal) ON t.slug = p.slug;