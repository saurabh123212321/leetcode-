import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, highestRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateQuiz } from "@/lib/ai.functions";
import { Brain, Sparkles, Loader2, Plus, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quizzes")({ component: QuizzesPage });

interface Question { question: string; options: string[]; correct: number; explanation?: string; }
interface Quiz { id: string; title: string; topic: string | null; difficulty: string; questions: Question[]; created_at: string; }

function QuizzesPage() {
  const { profile, roles } = useAuth();
  const role = highestRole(roles);
  const canCreate = role !== "student";
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ s: 0, t: 0 });
  const [genTopic, setGenTopic] = useState("");
  const [genDiff, setGenDiff] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [genBusy, setGenBusy] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const genFn = useServerFn(generateQuiz);

  async function load() {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from("quizzes").select("*").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false });
    setQuizzes(((data as unknown) as Quiz[]) ?? []);
    const { data: at } = await supabase.from("quiz_attempts").select("*").eq("created_by", profile.id).order("created_at", { ascending: false }).limit(20);
    setAttempts(at ?? []);
  }
  useEffect(() => { load(); }, [profile?.tenant_id]);

  function start(q: Quiz) { setActive(q); setAnswers({}); setSubmitted(false); }

  async function submit() {
    if (!active || !profile) return;
    let s = 0;
    active.questions.forEach((q, i) => { if (answers[i] === q.correct) s++; });
    setScore({ s, t: active.questions.length });
    setSubmitted(true);
    await supabase.from("quiz_attempts").insert({
      tenant_id: profile.tenant_id ?? "", created_by: profile.id, quiz_id: active.id,
      score: s, total: active.questions.length, answers: answers as any,
    });
    load();
  }

  async function gen() {
    if (!genTopic.trim()) return;
    setGenBusy(true);
    try {
      await genFn({ data: { topic: genTopic, difficulty: genDiff, count: 5 } });
      toast.success("Quiz generated");
      setGenTopic("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setGenBusy(false); }
  }

  if (active) {
    return (
      <div className="p-8 overflow-y-auto max-h-screen">
        <button onClick={() => setActive(null)} className="text-sm text-slate-400 mb-4">← Back</button>
        <h1 className="text-2xl font-bold mb-1">{active.title}</h1>
        <p className="text-slate-400 mb-6 capitalize">{active.difficulty} • {active.questions.length} questions</p>

        {submitted && (
          <div className={`p-4 rounded mb-6 ${score.s / score.t >= 0.7 ? "bg-emerald-900/40 border border-emerald-700" : "bg-amber-900/40 border border-amber-700"}`}>
            <div className="text-xl font-bold">Score: {score.s} / {score.t} ({Math.round(score.s / score.t * 100)}%)</div>
          </div>
        )}

        <div className="space-y-6 max-w-3xl">
          {active.questions.map((q, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="font-medium mb-3">{i + 1}. {q.question}</div>
              <div className="space-y-2">
                {q.options.map((o, oi) => {
                  const sel = answers[i] === oi;
                  const correct = submitted && oi === q.correct;
                  const wrong = submitted && sel && oi !== q.correct;
                  return (
                    <button key={oi} disabled={submitted}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: oi }))}
                      className={`w-full text-left p-3 rounded border text-sm flex items-center gap-2
                        ${correct ? "bg-emerald-900/40 border-emerald-600" : wrong ? "bg-red-900/40 border-red-600" : sel ? "bg-indigo-900/40 border-indigo-600" : "bg-slate-950 border-slate-800 hover:border-slate-600"}`}>
                      {correct && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {wrong && <XCircle size={16} className="text-red-400" />}
                      {o}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && <div className="mt-3 text-xs text-slate-400 bg-slate-950 p-2 rounded">💡 {q.explanation}</div>}
            </div>
          ))}
        </div>

        {!submitted && (
          <button onClick={submit} disabled={Object.keys(answers).length !== active.questions.length}
            className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50">Submit answers</button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Brain /> Quizzes</h1>

      <div className="bg-gradient-to-br from-pink-900/30 to-indigo-900/30 border border-pink-800/30 rounded-lg p-5 mb-8">
        <div className="font-semibold mb-3 flex items-center gap-2"><Sparkles size={16} /> Generate quiz with AI</div>
        <div className="flex gap-2">
          <input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="Topic (e.g. Recursion, Binary Trees)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" />
          <select value={genDiff} onChange={(e) => setGenDiff(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded px-2 text-sm">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button onClick={gen} disabled={genBusy || !genTopic.trim()} className="px-4 bg-pink-600 hover:bg-pink-500 rounded text-sm flex items-center gap-1 disabled:opacity-50">
            {genBusy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Generate
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((q) => {
          const att = attempts.filter((a) => a.quiz_id === q.id);
          const best = att.length ? Math.max(...att.map((a) => a.score / Math.max(a.total, 1))) : null;
          return (
            <button key={q.id} onClick={() => start(q)} className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-left hover:border-indigo-500">
              <div className="text-xs text-indigo-400 mb-1 capitalize">{q.difficulty}</div>
              <div className="font-semibold mb-1">{q.title}</div>
              <div className="text-xs text-slate-400">{q.questions?.length ?? 0} questions</div>
              {best !== null && <div className="text-xs text-emerald-400 mt-2">Best: {Math.round(best * 100)}%</div>}
            </button>
          );
        })}
        {quizzes.length === 0 && <div className="text-slate-500 text-sm">No quizzes yet. Generate one above.</div>}
      </div>
    </div>
  );
}
