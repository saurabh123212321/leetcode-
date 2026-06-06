import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const COLOR = z.enum(["red", "yellow", "green", "blue", "purple"]);

/** Generate problem statement + test cases dynamically via AI for any file */
export const generateProblemStatementAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    file_name: z.string().min(1),
    file_content: z.string().max(20000),
    language: z.string(),
  }).parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    
    if (!apiKey) {
      return {
        title: data.file_name.replace(/\.\w+$/, "").replace(/^\d+\.\s*/, ""),
        description: "Problem statement generation unavailable. Configure LOVABLE_API_KEY.",
        functionSig: "function solve(input) { }",
        constraints: "Check the original file for requirements",
        examples: [{ input: "sample", output: "expected", explanation: "See file content" }],
        testCases: { public: [], hidden: [] },
      };
    }

    try {
      // Generate problem statement
      const statementPrompt = `Given a coding problem file named "${data.file_name}" with this reference solution:
\`\`\`${data.language}
${data.file_content.slice(0, 3000)}
\`\`\`

Generate a DETAILED problem statement (NOT short) in this EXACT JSON format:
{
  "title": "Problem Title",
  "description": "Comprehensive 3-4 paragraph detailed explanation of what the problem is asking, its real-world applications, key concepts, and what the solver should consider",
  "constraints": "Input ranges, output specifications, complexity requirements",
  "examples": [
    {"input": "sample input", "output": "expected output", "explanation": "detailed explanation"},
    {"input": "another input", "output": "expected output", "explanation": "detailed explanation"},
    {"input": "edge case", "output": "expected output", "explanation": "detailed explanation"},
    {"input": "complex case", "output": "expected output", "explanation": "detailed explanation"}
  ]
}

Make descriptions DETAILED and comprehensive, not short. Include algorithm concepts, optimizations, and real-world use cases.`;

      const statementRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a coding problem expert. Output ONLY valid JSON, no markdown." },
            { role: "user", content: statementPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      let statement = {
        title: data.file_name,
        description: "Problem description generated via AI",
        constraints: "See examples for specifications",
        examples: [{ input: "1", output: "output", explanation: "Example" }],
      };

      if (statementRes.ok) {
        const statementData = await statementRes.json() as any;
        const content = statementData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          statement = { ...statement, ...parsed };
        }
      }

      // Generate test cases
      const testPrompt = `Based on this problem:
Title: ${statement.title}
Description: ${statement.description.slice(0, 1000)}
Constraints: ${statement.constraints}

Generate 15 diverse test cases (5 public, 10 hidden) in this EXACT JSON format:
{
  "public": [
    {"input": "input1", "expected": "output1", "explanation": "why this tests ..."},
    {"input": "input2", "expected": "output2", "explanation": "why this tests ..."},
    {"input": "input3", "expected": "output3", "explanation": "why this tests ..."},
    {"input": "input4", "expected": "output4", "explanation": "why this tests ..."},
    {"input": "input5", "expected": "output5", "explanation": "why this tests ..."}
  ],
  "hidden": [
    {"input": "input6", "expected": "output6"},
    {"input": "input7", "expected": "output7"},
    {"input": "input8", "expected": "output8"},
    {"input": "input9", "expected": "output9"},
    {"input": "input10", "expected": "output10"},
    {"input": "input11", "expected": "output11"},
    {"input": "input12", "expected": "output12"},
    {"input": "input13", "expected": "output13"},
    {"input": "input14", "expected": "output14"},
    {"input": "input15", "expected": "output15"}
  ]
}

Ensure test cases cover:
- Basic cases
- Edge cases (0, 1, min, max values)
- Large inputs
- Boundary conditions
- Performance-critical cases`;

      const testRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a QA expert. Output ONLY valid JSON, no markdown." },
            { role: "user", content: testPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      let testCases = { public: [], hidden: [] };

      if (testRes.ok) {
        const testData = await testRes.json() as any;
        const content = testData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          testCases = {
            public: (parsed.public || []).slice(0, 5),
            hidden: (parsed.hidden || []).slice(0, 10),
          };
        }
      }

      return {
        title: statement.title,
        description: statement.description,
        functionSig: statement.functionSig || `function solve(input) { }`,
        constraints: statement.constraints,
        examples: statement.examples || [],
        testCases,
      };
    } catch (err: any) {
      console.error("AI generation error:", err);
      return {
        title: data.file_name,
        description: "Error generating problem statement. Please check the file content.",
        functionSig: "function solve(input) { }",
        constraints: "See file for details",
        examples: [],
        testCases: { public: [], hidden: [] },
      };
    }
  });

/** List files tagged with a given color (across all user's workspaces). */
export const getRevisionFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ color: COLOR }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: files, error } = await supabase
      .from("files")
      .select("id,name,language,content,color_tag,workspace_id,folder_id,updated_at")
      .eq("color_tag", data.color)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { files: files ?? [], userId };
  });

/** Start a revision session (reuses practice_sessions table with prefix). */
export const startRevisionSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    color: COLOR,
    duration_seconds: z.number().min(60).max(60 * 60 * 4),
    file_ids: z.array(z.string().uuid()).min(1).max(20),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!prof?.tenant_id) throw new Error("No tenant");
    const { data: ps, error } = await supabase.from("practice_sessions").insert({
      user_id: userId,
      tenant_id: prof.tenant_id,
      title: `Revision (${data.color}) — ${data.file_ids.length} files`,
      duration_seconds: data.duration_seconds,
      file_ids: data.file_ids,
      problem_ids: [],
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { session: ps };
  });

/** Submit a revision session: AI grades each answer + overall, returns score 0-10. */
export const submitRevisionSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    session_id: z.string().uuid(),
    answers: z.array(z.object({
      file_id: z.string().uuid(),
      file_name: z.string(),
      original_code: z.string().max(20000),
      user_code: z.string().max(20000),
    })).min(1),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    let score: number | null = null;
    let feedback = "AI grading unavailable. Please configure LOVABLE_API_KEY.";
    let perFile: any[] = [];

    if (apiKey) {
      const prompt = `You are a strict senior coding interviewer reviewing a candidate's revision attempt of previously-tagged code files. For EACH file, compare the user's rewritten code with the original and judge: correctness, completeness, code quality, edge cases, time/space complexity, and how well it shows the candidate truly understands (vs. memorized) the problem.

Return STRICT JSON ONLY (no markdown fences), schema:
{
  "overall_score": number 0-10,
  "summary": string (concise markdown — strengths, weaknesses, "needs more revision?" verdict),
  "files": [{
    "file_name": string,
    "score": number 0-10,
    "verdict": "correct" | "partial" | "wrong" | "empty",
    "complexity": string,
    "notes": string (markdown — what's missing, bugs, suggestions)
  }]
}

Files to grade:
${data.answers.map((a, i) => `--- File ${i + 1}: ${a.file_name} ---
ORIGINAL:
\`\`\`
${a.original_code.slice(0, 4000)}
\`\`\`
USER REWROTE:
\`\`\`
${a.user_code.slice(0, 4000)}
\`\`\`
`).join("\n")}`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a strict coding interviewer. Output JSON only." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (r.ok) {
        const j = await r.json() as any;
        let txt = j.choices?.[0]?.message?.content ?? "{}";
        txt = txt.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        try {
          const parsed = JSON.parse(txt);
          score = Number(parsed.overall_score) || 0;
          feedback = parsed.summary ?? feedback;
          perFile = Array.isArray(parsed.files) ? parsed.files : [];
        } catch { feedback = txt.slice(0, 2000); }
      } else {
        feedback = `AI grader returned ${r.status}. Try again in a moment.`;
      }
    }

    const payload = data.answers.map((a, i) => ({
      file_id: a.file_id,
      file_name: a.file_name,
      user_code: a.user_code,
      ai: perFile[i] ?? null,
    }));

    const { error } = await (supabase.from("practice_sessions") as any)
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        answers: payload,
        ai_score: score,
        ai_feedback: feedback,
      })
      .eq("id", data.session_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { score, feedback, files: perFile };
  });

/** History of revision sessions only (filters by title prefix). */
export const listRevisionSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("practice_sessions")
      .select("id,title,status,ai_score,ai_feedback,started_at,ended_at,duration_seconds")
      .eq("user_id", userId)
      .ilike("title", "Revision%")
      .order("started_at", { ascending: false })
      .limit(20);
    return { sessions: data ?? [] };
  });
