-- Add topic support to company-wise LeetCode questions
ALTER TABLE public.cw_questions
  ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS cw_questions_topics_idx ON public.cw_questions USING GIN(topics);

-- Backfill topics from matching internal problems when slug data exists.
UPDATE public.cw_questions
SET topics = (
  SELECT array_agg(lower(tag))
  FROM unnest(p.tags) AS tag
)
FROM public.problems p
WHERE p.slug = cw_questions.slug
  AND p.tags IS NOT NULL;
