import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const startPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    title: z.string().min(1).max(120),
    duration_seconds: z.number().min(60).max(60 * 60 * 3),
    file_ids: z.array(z.string().uuid()).default([]),
    problem_ids: z.array(z.string().uuid()).default([]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!prof?.tenant_id) throw new Error("No tenant");
    const { data: ps, error } = await supabase.from("practice_sessions").insert({
      user_id: userId,
      tenant_id: prof.tenant_id,
      title: data.title,
      duration_seconds: data.duration_seconds,
      file_ids: data.file_ids,
      problem_ids: data.problem_ids,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { session: ps };
  });

export const submitPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    session_id: z.string().uuid(),
    answers: z.array(z.object({
      question: z.string(),
      answer: z.string().max(20000),
    })),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    let score: number | null = null;
    let feedback = "AI grading unavailable.";
    if (apiKey) {
      const prompt = `Grade the following interview answers out of 10 overall. Return strict JSON: {"score": number 0-10, "feedback": string markdown summary}.\n\n${data.answers.map((a, i) => `Q${i+1}: ${a.question}\nAnswer:\n${a.answer}\n---`).join("\n")}`;
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a strict but fair coding interview grader. Output JSON only, no markdown fences." },
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
          score = Number(parsed.score) || 0;
          feedback = parsed.feedback ?? feedback;
        } catch { feedback = txt; }
      }
    }
    const { error } = await (supabase.from("practice_sessions") as any)
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        answers: data.answers,
        ai_score: score,
        ai_feedback: feedback,
      })
      .eq("id", data.session_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { score, feedback };
  });

export const listPractice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("practice_sessions")
      .select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(20);
    return { sessions: data ?? [] };
  });

export const generatePracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    topic: z.string().min(1).max(120),
    count: z.number().min(1).max(10).default(3),
    difficulty: z.enum(["easy","medium","hard"]).default("medium"),
  }).parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI not configured");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Output strict JSON only. Return only valid JSON with no markdown fences." },
          { role: "user", content: `Generate ${data.count} ${data.difficulty} coding interview practice questions on \"${data.topic}\". Return strict JSON matching this schema:
{
  "questions": [
    {
      "title": "Question title",
      "statement": "Detailed problem statement with input/output formatting and what the solver should compute.",
      "constraints": "Input limits, output limits, time/memory guidance.",
      "examples": [
        {"input": "sample input", "output": "sample output", "explanation": "Why this example matters."}
      ]
    }
  ]
}
Provide concise titles and at least one example for each question.` },
        ],
      }),
    });
    const j = await r.json() as any;
    let txt = j.choices?.[0]?.message?.content ?? "{}";
    txt = txt.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const normalizeExample = (ex: any) => ({
      input: String(ex?.input ?? ex?.stdin ?? "").trim(),
      output: String(ex?.output ?? ex?.expected ?? "").trim(),
      explanation: String(ex?.explanation ?? ex?.explanation ?? "").trim(),
    });

    const normalizeQuestion = (item: any) => ({
      title: String(item?.title ?? "").trim(),
      statement: String(item?.statement ?? item?.title ?? "").trim(),
      constraints: String(item?.constraints ?? "").trim(),
      examples: Array.isArray(item?.examples) ? item.examples.map(normalizeExample).filter((ex) => ex.input && ex.output) : [],
    });

    try {
      const parsed = JSON.parse(txt);
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : [];
      const questions = rawQuestions.map(normalizeQuestion).filter((q) => q.title);
      return { questions };
    } catch {
      // fallback for old format or malformed JSON
      try {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) {
          return { questions: parsed.map((title: any) => ({ title: String(title).trim(), statement: String(title).trim(), constraints: "", examples: [] })).filter((q) => q.title) };
        }
      } catch {
        // ignore
      }
      return { questions: [] };
    }
  });
