// Server functions for the LeetCode-style problems system.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const JUDGE0 = "https://ce.judge0.com";
const LANG_MAP: Record<string, number> = {
  javascript: 63, typescript: 74, python: 71, java: 62,
  cpp: 54, c: 50, go: 60, ruby: 72, rust: 73,
};

function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Service role key required for grading");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Public: list published problems (works for signed-out visitors too via anon SELECT policy)
export const listProblems = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("problems")
    .select("id,slug,title,difficulty,tags,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { problems: data ?? [] };
});

// Public: fetch single problem + sample tests
export const getProblem = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: problem, error } = await sb
      .from("problems")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!problem) throw new Error("Problem not found");
    const { data: tests } = await sb
      .from("problem_tests")
      .select("id,stdin,expected_stdout,ordinal")
      .eq("problem_id", problem.id)
      .eq("is_sample", true)
      .order("ordinal");
    return { problem, sample_tests: tests ?? [] };
  });

async function runOne(language: string, code: string, stdin: string, time_limit_ms: number) {
  const lang_id = LANG_MAP[language] ?? 63;
  const res = await fetch(`${JUDGE0}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: code,
      language_id: lang_id,
      stdin,
      cpu_time_limit: Math.max(1, Math.ceil(time_limit_ms / 1000)),
      memory_limit: 128000,
    }),
  });
  if (!res.ok) {
    return { stdout: "", stderr: `Judge0 ${res.status}`, status: "error", time: null as number | null, memory: null as number | null };
  }
  const j = (await res.json()) as any;
  return {
    stdout: (j.stdout ?? "") as string,
    stderr: (j.stderr ?? j.compile_output ?? j.message ?? "") as string,
    status: (j.status?.description ?? "Unknown") as string,
    time: j.time ? Number(j.time) : null,
    memory: j.memory ?? null,
  };
}

// Anyone (signed in) can run code against sample tests without saving a submission
export const runProblemSamples = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      problem_id: z.string().uuid(),
      language: z.string(),
      code: z.string().max(50000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: problem } = await supabase.from("problems").select("id,time_limit_ms").eq("id", data.problem_id).single();
    if (!problem) throw new Error("Problem not found");
    const { data: tests } = await supabase
      .from("problem_tests")
      .select("id,stdin,expected_stdout,ordinal")
      .eq("problem_id", data.problem_id)
      .eq("is_sample", true)
      .order("ordinal");
    const results: any[] = [];
    for (const t of tests ?? []) {
      const r = await runOne(data.language, data.code, t.stdin, problem.time_limit_ms ?? 2000);
      const got = (r.stdout ?? "").replace(/\s+$/g, "");
      const want = (t.expected_stdout ?? "").replace(/\s+$/g, "");
      results.push({
        ordinal: t.ordinal,
        passed: got === want && !r.stderr,
        stdin: t.stdin,
        expected: t.expected_stdout,
        got: r.stdout,
        stderr: r.stderr,
        status: r.status,
        time: r.time,
      });
    }
    return { results };
  });

// Submit against ALL tests (sample + hidden via admin client), persist submission.
export const checkCodeFormat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      language: z.string(),
      code: z.string().max(50000),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const warnings: string[] = [];
    const code = data.code;
    
    // Check for common output format violations
    if (data.language === "cpp") {
      // Look for cout with string + value patterns that suggest output prompts
      if (/cout\s*<<\s*["'][^"']*(?:enter|input|read|please|prompt)/.test(code)) {
        warnings.push("❌ Found output with prompt text (e.g., 'enter number'). Remove all prompts — output ONLY the result.");
      }
      if (/cout\s*<<\s*["'][a-zA-Z]/i.test(code) && /cout\s*<<\s*(?:sum|result|answer|value)/i.test(code)) {
        warnings.push("⚠️ Output includes text before value. Ensure you're outputting clean numbers only.");
      }
    } else if (data.language === "python") {
      if (/print\(["'][^"']*(?:enter|input|read|please|prompt)/.test(code)) {
        warnings.push("❌ Found print() with prompt text. Remove all prompts — output ONLY the result.");
      }
    } else if (data.language === "java") {
      if (/System\.out\.println\(["'][^"']*(?:enter|input|read|please|prompt)/.test(code)) {
        warnings.push("❌ Found System.out.println with prompt text. Remove all prompts — output ONLY the result.");
      }
    } else if (data.language === "javascript") {
      if (/console\.log\(["'][^"']*(?:enter|input|read|please|prompt)/.test(code)) {
        warnings.push("❌ Found console.log with prompt text. Remove all prompts — output ONLY the result.");
      }
    }
    
    return { warnings, isClean: warnings.length === 0 };
  });

export const submitProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      problem_id: z.string().uuid(),
      language: z.string(),
      code: z.string().max(50000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const admin = getAdmin();
    const { data: problem, error: pErr } = await admin
      .from("problems")
      .select("id,time_limit_ms")
      .eq("id", data.problem_id)
      .single();
    if (pErr || !problem) throw new Error("Problem not found");
    const { data: tests } = await admin
      .from("problem_tests")
      .select("id,stdin,expected_stdout,ordinal,is_sample")
      .eq("problem_id", data.problem_id)
      .order("ordinal");
    const all = tests ?? [];

    let passed = 0;
    let firstFailure: any = null;
    let maxTime = 0;
    let maxMemory = 0;
    let status: "accepted" | "wrong_answer" | "runtime_error" | "compile_error" | "tle" = "accepted";

    for (const t of all) {
      const r = await runOne(data.language, data.code, t.stdin, problem.time_limit_ms ?? 2000);
      if (r.time && r.time > maxTime) maxTime = r.time;
      if (r.memory && r.memory > maxMemory) maxMemory = r.memory;
      const got = (r.stdout ?? "").replace(/\s+$/g, "");
      const want = (t.expected_stdout ?? "").replace(/\s+$/g, "");
      const isPass = got === want && !r.stderr;
      if (isPass) {
        passed++;
      } else {
        if (!firstFailure) {
          firstFailure = {
            ordinal: t.ordinal,
            is_sample: t.is_sample,
            stdin: t.is_sample ? t.stdin : "(hidden)",
            expected: t.is_sample ? t.expected_stdout : "(hidden)",
            got: r.stdout,
            stderr: r.stderr,
            status: r.status,
          };
        }
        if (r.status?.toLowerCase().includes("time")) status = "tle";
        else if (r.status?.toLowerCase().includes("compil")) status = "compile_error";
        else if (r.stderr) status = "runtime_error";
        else status = "wrong_answer";
        break; // stop on first failure
      }
    }
    if (passed === all.length && all.length > 0) status = "accepted";

    // Persist
    const { data: prof } = await admin.from("profiles").select("tenant_id").eq("id", context.userId).single();
    const { data: sub } = await admin.from("problem_submissions").insert({
      problem_id: data.problem_id,
      user_id: context.userId,
      tenant_id: prof?.tenant_id ?? null,
      language: data.language,
      code: data.code,
      status,
      passed_tests: passed,
      total_tests: all.length,
      runtime_ms: maxTime ? maxTime * 1000 : null,
      memory_kb: maxMemory || null,
      failure_detail: firstFailure,
    }).select("id").single();

    return {
      submission_id: sub?.id ?? null,
      status,
      passed,
      total: all.length,
      runtime_ms: maxTime ? maxTime * 1000 : null,
      memory_kb: maxMemory || null,
      failure: firstFailure,
    };
  });

// Recent submissions for the current user on a problem
export const listMySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ problem_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("problem_submissions")
      .select("id,status,passed_tests,total_tests,runtime_ms,memory_kb,language,created_at")
      .eq("problem_id", data.problem_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return { submissions: rows ?? [] };
  });
