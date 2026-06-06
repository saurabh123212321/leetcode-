import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GQL = "https://leetcode.com/graphql/";
const TTL_MS = 1000 * 60 * 30;

async function getCache(key: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("leetcode_cache").select("payload,fetched_at").eq("cache_key", key).maybeSingle();
  return data;
}
async function setCache(key: string, payload: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("leetcode_cache").upsert({ cache_key: key, payload, fetched_at: new Date().toISOString() }, { onConflict: "cache_key" });
}

async function gql(query: string, variables: Record<string, any>) {
  const r = await fetch(GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; CodeLearnAI/1.0)",
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`LeetCode GraphQL ${r.status}`);
  const j = await r.json() as any;
  if (j.errors) throw new Error(j.errors[0]?.message ?? "LeetCode error");
  return j.data;
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const row = await getCache(key);
  if (row && new Date(row.fetched_at).getTime() > Date.now() - TTL_MS) return row.payload as T;
  try {
    const fresh = await fetcher();
    await setCache(key, fresh);
    return fresh;
  } catch (e) {
    if (row) return row.payload as T;
    throw e;
  }
}

const PROBLEMSET_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        acRate
        difficulty
        frontendQuestionId: questionFrontendId
        isFavor
        paidOnly: isPaidOnly
        status
        title
        titleSlug
        topicTags { name slug }
      }
    }
  }
`;

const DAILY_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        acRate
        difficulty
        frontendQuestionId: questionFrontendId
        title
        titleSlug
        topicTags { name slug }
      }
    }
  }
`;

const PROBLEM_QUERY = `
  query selectProblem($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      titleSlug
      difficulty
      content
      topicTags { name slug }
      codeSnippets { lang langSlug code }
      sampleTestCase
      hints
      similarQuestions
    }
  }
`;

const USER_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { realName ranking userAvatar reputation aboutMe }
      submitStats: submitStatsGlobal {
        acSubmissionNum { difficulty count submissions }
      }
    }
  }
`;

export const lcDaily = createServerFn({ method: "GET" }).handler(async () => {
  const d = await cached("daily:v2", () => gql(DAILY_QUERY, {}));
  return (d as any)?.activeDailyCodingChallengeQuestion ?? null;
});

export const lcProblems = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({
    limit: z.number().min(1).max(100).default(50),
    skip: z.number().min(0).default(0),
    tags: z.string().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    search: z.string().max(120).optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const filters: any = {};
    if (data.difficulty) filters.difficulty = data.difficulty;
    if (data.tags) filters.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (data.search) filters.searchKeywords = data.search;
    const key = `pl:v2:${JSON.stringify({ ...data })}`;
    const d = await cached(key, () => gql(PROBLEMSET_QUERY, {
      categorySlug: "",
      limit: data.limit,
      skip: data.skip,
      filters,
    }));
    return (d as any)?.problemsetQuestionList ?? { total: 0, questions: [] };
  });

export const lcProblem = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const d = await cached(`prob:v2:${data.slug}`, () => gql(PROBLEM_QUERY, { titleSlug: data.slug }));
    return (d as any)?.question ?? null;
  });

export const lcUser = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ username: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data }) => {
    const d = await cached(`user:v2:${data.username}`, () => gql(USER_QUERY, { username: data.username }));
    return (d as any)?.matchedUser ?? null;
  });
