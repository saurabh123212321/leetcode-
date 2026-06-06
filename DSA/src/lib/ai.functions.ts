// Server functions: AI chat (Lovable AI Gateway) + Judge0 code execution.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const JUDGE0 = "https://ce.judge0.com";
const LANG_MAP: Record<string, number> = {
  javascript: 63, // Node.js
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  ruby: 72,
  rust: 73,
};

export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      language: z.string(),
      code: z.string().max(50000),
      stdin: z.string().optional().default(""),
      file_id: z.string().uuid().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const lang_id = LANG_MAP[data.language] ?? 63;
    const res = await fetch(`${JUDGE0}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: data.code,
        language_id: lang_id,
        stdin: data.stdin,
        cpu_time_limit: 5,
        memory_limit: 128000,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { stdout: "", stderr: `Judge0 error ${res.status}: ${t.slice(0, 200)}`, status: "error", time: null, memory: null };
    }
    const j = await res.json() as any;
    const stdout = j.stdout ?? "";
    const stderr = j.stderr ?? j.compile_output ?? j.message ?? "";
    const status = j.status?.description ?? "Unknown";
    const time = j.time ? Number(j.time) : null;
    const memory = j.memory ?? null;

    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (prof?.tenant_id) {
      await supabase.from("coding_submissions").insert({
        tenant_id: prof.tenant_id,
        created_by: userId,
        file_id: data.file_id ?? null,
        language: data.language,
        code: data.code,
        stdin: data.stdin,
        stdout, stderr, status,
        execution_time: time,
        memory_kb: memory,
      });
    }
    return { stdout, stderr, status, time, memory };
  });

// ---------- AI Chat (Lovable AI Gateway) ----------
export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      conversation_id: z.string().uuid().optional().nullable(),
      message: z.string().min(1).max(8000),
      context_code: z.string().max(20000).optional(),
      mode: z.enum(["chat", "explain", "fix", "review", "generate", "optimize"]).default("chat"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!prof?.tenant_id) throw new Error("No tenant");

    let convoId = data.conversation_id;
    if (!convoId) {
      const { data: c } = await supabase.from("ai_conversations").insert({
        tenant_id: prof.tenant_id,
        created_by: userId,
        title: data.message.slice(0, 60),
      }).select("id").single();
      convoId = c!.id;
    }

    // Get conversation history
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role,content")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Save user message
    await supabase.from("ai_messages").insert({
      tenant_id: prof.tenant_id,
      conversation_id: convoId!,
      created_by: userId,
      role: "user",
      content: data.message,
    });

    const systemPrompts: Record<string, string> = {
      chat: "You are an expert programming tutor and pair-programmer. Be concise, accurate, use markdown code blocks.",
      explain: "Explain the provided code clearly with line-by-line reasoning. Use markdown.",
      fix: "Find and fix bugs in the provided code. Return corrected code in a markdown block plus a short explanation.",
      review: "Review the provided code: list issues (correctness, style, perf, security), then suggest improvements.",
      generate: "Generate clean, runnable code for the user's request with comments.",
      optimize: `You are a DSA coding assistant inside an online compiler/IDE.

When solving a coding problem, always provide solutions in this EXACT order and format:

## PROBLEM UNDERSTANDING
Briefly restate what the problem is asking.

## BRUTE FORCE APPROACH
**Explanation:** ...
**Time Complexity:** O(...)
**Space Complexity:** O(...)
\`\`\`<language>
// brute force code in its own function
\`\`\`

## BETTER APPROACH
**Explanation:** ...
**Time Complexity:** O(...)
**Space Complexity:** O(...)
\`\`\`<language>
// better code in its own function
\`\`\`

## OPTIMAL APPROACH
**Explanation:** ...
**Time Complexity:** O(...)
**Space Complexity:** O(...)
\`\`\`<language>
// optimal code in its own function
\`\`\`

## FINAL CODE STRUCTURE
A single-file implementation containing ALL three approaches as separate functions, with a clean minimal main()/driver calling whichever the user wants. Use proper comments separating each section. Never remove previous approaches when giving the optimal one. Prioritize readability — this IDE is used for DSA learning and revision.`,
    };

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompts[data.mode] },
      ...((history ?? []) as any[]).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.context_code ? `${data.message}\n\n\`\`\`\n${data.context_code}\n\`\`\`` : data.message },
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI is not configured for this project yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "tanstack-start" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });

    if (!res.ok) {
      const t = await res.text();
      const reply = res.status === 429
        ? "Rate limit reached. Please wait a moment."
        : res.status === 402
        ? "AI credits exhausted. Please add credits to continue."
        : `AI error: ${t.slice(0, 200)}`;
      await supabase.from("ai_messages").insert({
        tenant_id: prof.tenant_id,
        conversation_id: convoId!,
        created_by: userId,
        role: "assistant",
        content: reply,
      });
      return { conversation_id: convoId, reply };
    }

    const json = await res.json() as any;
    const reply = json.choices?.[0]?.message?.content ?? "(no response)";

    await supabase.from("ai_messages").insert({
      tenant_id: prof.tenant_id,
      conversation_id: convoId!,
      created_by: userId,
      role: "assistant",
      content: reply,
    });

    return { conversation_id: convoId, reply };
  });

// Generate a quiz with AI
export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      topic: z.string().min(1).max(100),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
      count: z.number().min(3).max(15).default(5),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();
    if (!prof?.tenant_id) throw new Error("No tenant");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI is not configured for this project yet.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "tanstack-start" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Output strict JSON only, no markdown fence. Schema: {\"questions\":[{\"question\":string,\"options\":[string,string,string,string],\"correct\":number,\"explanation\":string}]}" },
          { role: "user", content: `Create ${data.count} ${data.difficulty} multiple-choice questions on "${data.topic}" (programming/CS).` },
        ],
      }),
    });
    const j = await res.json() as any;
    let txt = j.choices?.[0]?.message?.content ?? "{}";
    txt = txt.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(txt);
    const questions = parsed.questions ?? [];

    const { data: quiz } = await supabase.from("quizzes").insert({
      tenant_id: prof.tenant_id,
      created_by: userId,
      title: `${data.topic} (${data.difficulty})`,
      topic: data.topic,
      difficulty: data.difficulty,
      questions,
      description: `AI-generated quiz on ${data.topic}`,
    }).select("id").single();

    return { quiz_id: quiz!.id, questions };
  });

// Summarize / extract notes from text
export const summarizeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ content: z.string().min(10).max(20000) }).parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI is not configured for this project yet.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "tanstack-start" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Summarize the note in 3-5 bullet points (markdown). Be concise." },
          { role: "user", content: data.content },
        ],
      }),
    });
    const j = await res.json() as any;
    return { summary: j.choices?.[0]?.message?.content ?? "" };
  });
