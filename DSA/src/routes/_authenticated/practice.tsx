import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startPractice, submitPractice, listPractice, generatePracticeQuestions } from "@/lib/practice.functions";
import { toast } from "sonner";
import { Clock, Play, Send, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice")({
  component: PracticePage,
  head: () => ({ meta: [{ title: "Timed Practice — CodeLearn AI" }] }),
});

function PracticePage() {
  const start = useServerFn(startPractice);
  const submit = useServerFn(submitPractice);
  const list = useServerFn(listPractice);
  const gen = useServerFn(generatePracticeQuestions);

  const [topic, setTopic] = useState("arrays");
  const [count, setCount] = useState(3);
  const [diff, setDiff] = useState<"easy"|"medium"|"hard">("medium");
  const [duration, setDuration] = useState(15);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);
  const [remaining, setRemaining] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number|null; feedback: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => { list().then(r => setHistory(r.sessions)).catch(() => {}); }, []);

  useEffect(() => {
    if (!session || result) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session, result]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await gen({ data: { topic, count, difficulty: diff } });
      if (!r.questions.length) throw new Error("No questions");
      setQuestions(r.questions);
      setAnswers(r.questions.map(() => ""));
      toast.success(`Generated ${r.questions.length} questions`);
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  }

  async function handleStart() {
    if (!questions.length) { toast.error("Generate questions first"); return; }
    const r = await start({ data: { title: `${topic} (${diff})`, duration_seconds: duration * 60, file_ids: [], problem_ids: [] } });
    setSession(r.session);
    setRemaining(duration * 60);
    setResult(null);
  }

  async function handleSubmit() {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const r = await submit({ data: { session_id: session.id, answers: questions.map((q, i) => ({ question: q, answer: answers[i] || "" })) } });
      setResult(r);
      toast.success("Submitted");
      const lst = await list(); setHistory(lst.sessions);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  const mins = Math.floor(remaining/60).toString().padStart(2,"0");
  const secs = (remaining%60).toString().padStart(2,"0");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Timed Interview Practice</h1>

      {!session && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="grid md:grid-cols-4 gap-2">
            <input value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="Topic" className="bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700"/>
            <select value={diff} onChange={(e)=>setDiff(e.target.value as any)} className="bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700">
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
            <input type="number" value={count} min={1} max={10} onChange={(e)=>setCount(Number(e.target.value))} className="bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700" placeholder="Questions"/>
            <input type="number" value={duration} min={1} max={180} onChange={(e)=>setDuration(Number(e.target.value))} className="bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700" placeholder="Minutes"/>
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={generating} className="rounded bg-pink-600 hover:bg-pink-700 text-white text-sm px-3 py-2 inline-flex items-center gap-1 disabled:opacity-50">
              {generating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} Generate Questions
            </button>
            {questions.length > 0 && (
              <button onClick={handleStart} className="rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-2 inline-flex items-center gap-1">
                <Play size={14}/> Start Timer ({duration}m)
              </button>
            )}
          </div>
          {questions.length > 0 && (
            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
              {questions.map((q,i) => <li key={i}>{q}</li>)}
            </ol>
          )}
        </div>
      )}

      {session && !result && (
        <div className="space-y-3">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
            <div className="text-amber-300 font-mono text-xl flex items-center gap-2"><Clock size={18}/> {mins}:{secs}</div>
            <button onClick={handleSubmit} disabled={submitting} className="rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50">
              <Send size={14}/> Submit
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-100">Q{i+1}. {q}</div>
              <textarea value={answers[i]} onChange={(e)=>setAnswers(a => a.map((x,k)=>k===i?e.target.value:x))}
                rows={8} className="w-full bg-slate-950 text-slate-100 rounded border border-slate-700 p-2 text-sm font-mono" placeholder="Your answer / code…"/>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <div className="text-2xl font-bold text-emerald-300">Score: {result.score ?? "—"}/10</div>
          <pre className="whitespace-pre-wrap text-sm text-slate-200">{result.feedback}</pre>
          <button onClick={() => { setSession(null); setResult(null); setQuestions([]); setAnswers([]); }} className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5">New session</button>
        </div>
      )}

      {history.length > 0 && !session && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-sm font-semibold text-slate-200 mb-2">History</div>
          <ul className="space-y-1 text-sm text-slate-400">
            {history.map(h => (
              <li key={h.id} className="flex justify-between">
                <span>{h.title}</span>
                <span>{h.ai_score ?? "—"}/10 · {h.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
