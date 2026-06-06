import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TTL_TESTS_MS = 1000 * 60 * 60 * 24 * 30; // 30d

const JUDGE0_LANG: Record<string, number> = {
  python: 71,
  javascript: 63,
  cpp: 54,
  java: 62,
};

async function aiJson(prompt: string): Promise<any | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise assistant. Reply ONLY with valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const txt: string = j?.choices?.[0]?.message?.content ?? "";
    const cleaned = txt.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

export const getOrGenerateTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    problem_slug: z.string().min(1).max(200),
    problem_title: z.string().max(300).optional(),
    problem_statement: z.string().max(8000).optional(),
    color: z.enum(["red","yellow","green","blue","purple"]).optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `tests:v1:${data.problem_slug}:${data.color ?? 'none'}`;
    const { data: row } = await supabaseAdmin
      .from("leetcode_cache").select("payload,fetched_at").eq("cache_key", key).maybeSingle();
    if (row && new Date(row.fetched_at).getTime() > Date.now() - TTL_TESTS_MS) {
      return row.payload as any;
    }
    const prompt = `Generate test cases for this coding problem in strict JSON ONLY.
Output schema: {"public": [{"input":"...","expected":"...","explanation":"..."}], "hidden": [{"input":"...","expected":"...","explanation":"..."}]}
Title: ${data.problem_title ?? data.problem_slug}
Color tag: ${data.color ?? 'none'}
Statement: ${(data.problem_statement ?? "").slice(0, 4000)}

Requirements:
- Return ONLY valid JSON matching the schema above. Do NOT include markdown or commentary.
- Produce 5 public sample tests (simple, illustrative) and 20-100 hidden tests (edge cases, large inputs, boundary values).
- All inputs/outputs must be plain stdin and stdout strings (no surrounding code, no interactive prompts). If the original code prints prompts, do NOT include them in the expected output.
- Keep each input under 500 chars.
`; 

    const ai = await aiJson(prompt);
    
    // Validate AI-generated tests: ensure inputs and outputs are reasonable
    const validateTest = (test: any): boolean => {
      const input = (test.input ?? '').toString().trim();
      const expected = (test.expected ?? '').toString().trim();
      
      // Check that input and expected output exist
      if (!input || !expected) return false;
      
      // Validate for common problems: sum, factorial, fibonacci, etc.
      if (input.match(/^\d+$/)) {
        const n = parseInt(input);
        // Validate Fibonacci is reasonable (< 1 million for practical inputs)
        if (expected.match(/^\d+$/) && parseInt(expected) > 1e15) return false;
        // Validate sum is reasonable (n*(n+1)/2 for sum of n)
        if (expected.match(/^\d+$/) && parseInt(expected) > n * n * 10) return false;
      }
      
      return true;
    };
    
    const normalize = (arr: any): any[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((t: any) => {
        const input = (t.input ?? t.stdin ?? t.stdin_data ?? t.stdin_input ?? t.stdin_str ?? '').toString();
        const expected = (t.expected ?? t.expected_stdout ?? t.output ?? t.stdout ?? t.expected_output ?? '').toString();
        const explanation = (t.explanation ?? t.note ?? t.desc ?? t.description ?? '').toString();
        return { input: input.trim(), expected: expected.trim(), explanation: explanation.trim() };
      }).filter((x: any) => x.input.length > 0 && x.expected.length > 0 && validateTest(x));
    };

    const payload = {
      public: normalize(ai?.public).slice(0, 50),
      hidden: normalize(ai?.hidden).slice(0, 500),
      generated_at: new Date().toISOString(),
    };
    await supabaseAdmin.from("leetcode_cache").upsert(
      { cache_key: key, payload, fetched_at: new Date().toISOString() },
      { onConflict: "cache_key" }
    );

    // Persist generated tests into problem_tests if the problem exists and has no sample tests yet
    try {
      const { data: prob } = await supabaseAdmin.from('problems').select('id').eq('slug', data.problem_slug).maybeSingle();
      if (prob && prob.id) {
        const { count } = await supabaseAdmin.from('problem_tests').select('id', { count: 'exact' }).eq('problem_id', prob.id).eq('is_sample', true);
        if ((count ?? 0) === 0) {
          const rows: any[] = [];
          (payload.public || []).slice(0, 20).forEach((t: any, i: number) => {
            rows.push({ problem_id: prob.id, stdin: (t.input ?? t.stdin ?? ''), expected_stdout: (t.expected ?? t.expected_stdout ?? ''), is_sample: true, ordinal: i });
          });
          const base = rows.length;
          (payload.hidden || []).slice(0, 100).forEach((t: any, i: number) => {
            rows.push({ problem_id: prob.id, stdin: (t.input ?? t.stdin ?? ''), expected_stdout: (t.expected ?? t.expected_stdout ?? ''), is_sample: false, ordinal: base + i });
          });
          if (rows.length > 0) {
            await supabaseAdmin.from('problem_tests').insert(rows);
          }
        }
      }
    } catch (e) {
      // swallow persist errors silently
      console.error('persist tests error', e);
    }
    return payload;
  });

export const runIdeTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    language: z.enum(["python", "javascript", "cpp", "java"]),
    source: z.string().max(50_000),
    tests: z.array(z.object({ input: z.string(), expected: z.string() })).max(110),
    custom_stdin: z.string().max(5000).optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const language_id = JUDGE0_LANG[data.language];
    const endpoint = process.env.JUDGE0_URL ?? "https://ce.judge0.com";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.JUDGE0_KEY) {
      headers["X-RapidAPI-Key"] = process.env.JUDGE0_KEY;
      headers["X-RapidAPI-Host"] = process.env.JUDGE0_HOST ?? "judge0-ce.p.rapidapi.com";
    }

    // Normalize output: handle whitespace, floating point, and formatting differences
    const normalizeOutput = (str: string): string => {
      return str.trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Try to normalize floating point numbers (e.g., "1.0" vs "1")
          return line.replace(/\b(\d+)\.0+\b/g, '$1');
        })
        .join('\n');
    };

    const cases = data.custom_stdin != null
      ? [{ input: data.custom_stdin, expected: "" }]
      : data.tests;

    const results: any[] = [];
    for (const [index, t] of cases.entries()) {
      try {
        const r = await fetch(`${endpoint}/submissions?base64_encoded=false&wait=true`, {
          method: "POST", headers,
          body: JSON.stringify({
            language_id,
            source_code: data.source,
            stdin: t.input,
            expected_output: data.custom_stdin != null ? undefined : t.expected,
            cpu_time_limit: 5,
          }),
        });
        let j: any;
        if (r.ok) {
          j = await r.json();
        } else {
          const text = await r.text();
          try {
            j = JSON.parse(text);
          } catch {
            j = { status: { description: `HTTP ${r.status}` }, message: text };
          }
        }
        const stdout = (j.stdout ?? "").toString();
        const expected = (t.expected ?? "").trim();
        const got = stdout.trim();
        // Improved comparison: normalize both strings before comparing
        const normalizedGot = normalizeOutput(got);
        const normalizedExpected = normalizeOutput(expected);
        const pass = data.custom_stdin != null ? true : (normalizedGot === normalizedExpected || got === expected);
        results.push({
          index: index + 1,
          input: t.input,
          expected,
          got,
          stderr: j.stderr ?? null,
          compile_output: j.compile_output ?? j.message ?? null,
          status: j.status?.description ?? "Unknown",
          time_ms: j.time ? Math.round(parseFloat(j.time) * 1000) : null,
          memory_kb: j.memory ?? null,
          pass,
        });
      } catch (e: any) {
        results.push({ index: index + 1, input: t.input, expected: t.expected, got: "", stderr: e.message, status: "Error", pass: false });
      }
    }
    const passed = results.filter((r) => r.pass).length;
    return { results, passed, total: results.length };
  });

export const analyzeComplexity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    language: z.string().max(20),
    source: z.string().max(50_000),
    problem_title: z.string().max(300).optional(),
    passed: z.number(),
    total: z.number(),
  }).parse(i))
  .handler(async ({ data }) => {
    const prompt = `You are a senior interviewer. Review this ${data.language} solution to "${data.problem_title ?? "this problem"}".
Tests: ${data.passed}/${data.total} passed.

Code:
\`\`\`${data.language}
${data.source.slice(0, 8000)}
\`\`\`

Return JSON: {"time_complexity":"O(...)","space_complexity":"O(...)","rating": number 0-10,"strengths":["..."],"improvements":["..."],"optimal_approach":"short paragraph describing optimal approach"}`;
    const ai = await aiJson(prompt);
    return ai ?? {
      time_complexity: "?", space_complexity: "?", rating: null,
      strengths: [], improvements: ["AI analysis unavailable"], optimal_approach: ""
    };
  });

export const getLcProblemForIde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const { lcProblem } = await import("@/lib/leetcode.functions");
    const p = await (lcProblem as any)({ data: { slug: data.slug } });
    if (!p) return null;
    const snippets: Record<string, string> = {};
    for (const s of (p.codeSnippets ?? [])) {
      if (s.langSlug === "python3" || s.langSlug === "python") snippets.python = s.code;
      if (s.langSlug === "javascript") snippets.javascript = s.code;
      if (s.langSlug === "cpp") snippets.cpp = s.code;
      if (s.langSlug === "java") snippets.java = s.code;
    }
    return {
      slug: p.titleSlug,
      title: p.title,
      difficulty: p.difficulty,
      content: p.content,
      sampleTestCase: p.sampleTestCase,
      hints: p.hints,
      snippets,
    };
  });

export const genOrCreateProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    slug: z.string().max(200).optional(),
    title: z.string().max(300).optional(),
    statement: z.string().max(16000).optional(),
    overwrite: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const seedSlug = (data.slug ?? data.title ?? 'ai-problem').toString().toLowerCase();
    const slug = seedSlug.replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 200);

    const prompt = `You are an assistant that must produce a complete LeetCode-style problem as valid JSON ONLY. Do NOT include any markdown or extra text.
Return JSON with the exact fields:
{
  "title": string,
  "slug": string (url-safe),
  "difficulty": "easy"|"medium"|"hard",
  "tags": [string],
  "companies": [string],
  "description": string (full problem statement, include input/output description),
  "constraints": string (one-or-more lines),
  "examples": [{"input": "stdin string","output":"expected stdout","explanation":"short"}],
  "starter_code": {"python":"...","javascript":"...","cpp":"...","java":"..."},
  "public": [{"stdin":"...","expected":"...","explanation":"..."}],
  "hidden": [{"stdin":"...","expected":"...","explanation":"..."}],
  "editorial": string (short explanation/approach)
}

Title: ${data.title ?? ''}
Statement (if provided): ${(data.statement ?? '').slice(0,4000)}

Guidelines:
- Provide 5 public sample tests and ~30 hidden tests (edge cases and large inputs).
- All inputs and outputs must be plain stdin and stdout strings (no surrounding code).
- For C++ starter code, include a class Solution wrapper and a minimal main() that reads stdin and calls the solution (use comments where signature is ambiguous).
- Keep each input under 500 chars.
`;

    const ai = await aiJson(prompt);
    if (!ai) return null;

    const title = ai.title ?? data.title ?? slug;
    const finalSlug = (ai.slug ?? slug).toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0,200);
    const difficulty = ai.difficulty ?? 'easy';
    const tags = Array.isArray(ai.tags) ? ai.tags : [];
    const companies = Array.isArray(ai.companies) ? ai.companies : [];
    const description = ai.description ?? ai.statement ?? '';
    const constraints = (ai.constraints ?? '') as string;
    const examples = Array.isArray(ai.examples) ? ai.examples : [];
    const starter_code = ai.starter_code ?? {};
    const editorial = ai.editorial ?? null;

    // Upsert problem
    const problemRow: any = {
      slug: finalSlug,
      title,
      description,
      difficulty,
      tags,
      constraints,
      examples: examples,
      starter_code: starter_code,
      editorial,
      is_published: true,
    };

    try {
      const up = await supabaseAdmin.from('problems').upsert(problemRow, { onConflict: 'slug' }).select('id').maybeSingle();
      let problemId = up.data?.id;

      // If we don't have an id from upsert, try to fetch it directly.
      if (!problemId) {
        const { data: p2 } = await supabaseAdmin.from('problems').select('id').eq('slug', finalSlug).maybeSingle();
        problemId = p2?.id;
      }

      if (problemId) {
        // Optionally insert tests only when none exist or when overwrite=true
        const { count } = await supabaseAdmin.from('problem_tests').select('id', { count: 'exact' }).eq('problem_id', problemId);
        if ((count ?? 0) === 0 || data.overwrite) {
          const rows: any[] = [];
          (ai.public ?? []).slice(0, 20).forEach((t: any, i: number) => {
            rows.push({ problem_id: problemId, stdin: (t.stdin ?? t.input ?? ''), expected_stdout: (t.expected ?? t.output ?? t.expected_stdout ?? ''), is_sample: true, ordinal: i });
          });
          const base = rows.length;
          (ai.hidden ?? []).slice(0, 200).forEach((t: any, i: number) => {
            rows.push({ problem_id: problemId, stdin: (t.stdin ?? t.input ?? ''), expected_stdout: (t.expected ?? t.output ?? t.expected_stdout ?? ''), is_sample: false, ordinal: base + i });
          });
          if (rows.length > 0) {
            await supabaseAdmin.from('problem_tests').insert(rows);
          }
        }
      }

      return { problem: problemRow, created_problem_id: problemId };
    } catch (e: any) {
      console.error('genOrCreateProblem error', e?.message ?? e);
      return null;
    }
  });
