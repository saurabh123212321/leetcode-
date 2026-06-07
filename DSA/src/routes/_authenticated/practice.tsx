import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import Editor from "@monaco-editor/react";
import { startPractice, submitPractice, listPractice, generatePracticeQuestions } from "@/lib/practice.functions";
import { getOrGenerateTests, runIdeTests, analyzeComplexity } from "@/lib/ide.functions";
import { toast } from "sonner";
import { Clock, Play, Send, Sparkles, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice")({
  component: PracticePage,
  head: () => ({ meta: [{ title: "Timed Practice — CodeLearn AI" }] }),
});

type PracticeQuestion = {
  title: string;
  statement: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
};

type PracticeSummary = {
  score: number | null;
  feedback: string;
  questionSummaries: Array<{
    title: string;
    statement: string;
    code: string;
    testRun: any | null;
    analysis: any | null;
  }>;
};

type Lang = "python" | "javascript" | "cpp" | "java";

const LANG_OPTS: { key: Lang; label: string; monaco: string }[] = [
  { key: "python", label: "Python", monaco: "python" },
  { key: "javascript", label: "JavaScript", monaco: "javascript" },
  { key: "cpp", label: "C++", monaco: "cpp" },
  { key: "java", label: "Java", monaco: "java" },
];

function getFunctionSignature(name: string, lang: Lang): string {
  const lower = name.toLowerCase();
  if (/sum.*digit|digit.*sum|sum of digits/.test(lower)) {
    if (lang === "python") return "def sumOfDigits(n: int) -> int:";
    if (lang === "javascript") return "function sumOfDigits(n) {";
    if (lang === "cpp") return "long long sumOfDigits(long long n) {";
    if (lang === "java") return "public static long sumOfDigits(long n) {";
  }
  if (/fibonacci/.test(lower)) {
    if (lang === "python") return "def fibonacci(n: int) -> int:";
    if (lang === "javascript") return "function fibonacci(n) {";
    if (lang === "cpp") return "long long fibonacci(long long n) {";
    if (lang === "java") return "public static long fibonacci(long n) {";
  }
  if (/prime|prime check/.test(lower)) {
    if (lang === "python") return "def isPrime(n: int) -> bool:";
    if (lang === "javascript") return "function isPrime(n) {";
    if (lang === "cpp") return "bool isPrime(long long n) {";
    if (lang === "java") return "public static boolean isPrime(long n) {";
  }
  return lang === "python" ? "def solve():" : `function solve() {`;
}

function getStarterCode(question: string, lang: Lang): string {
  const signature = getFunctionSignature(question, lang);
  if (lang === "python") return `# ${question}\n\n${signature}\n    # Write your solution here\n    pass\n`;
  if (lang === "javascript") return `// ${question}\n\n${signature}\n  // Write your solution here\n}\n`;
  if (lang === "cpp") return `// ${question}\n\n${signature}\n  // Write your solution here\n}\n`;
  if (lang === "java") return `// ${question}\n\npublic static ${signature}\n    // Write your solution here\n  }\n`;
  return signature;
}

function wrapFunctionCode(code: string, lang: Lang, problemName: string): string {
  const lower = problemName.toLowerCase();
  const isSumOfDigits = /sum.*digit|digit.*sum|sum of digits/.test(lower);
  const isFibonacci = /fibonacci/.test(lower);
  const isPrimeCheck = /prime|prime check/.test(lower);
  const defaultName = isSumOfDigits ? "sumOfDigits" : isFibonacci ? "fibonacci" : isPrimeCheck ? "isPrime" : "solve";

  type Signature = { name: string; params: string[]; returnType?: string };

  function parseFunctionSignature(code: string, lang: Lang): Signature | null {
    if (lang === "python") {
      const match = code.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
      if (!match) return null;
      return { name: match[1], params: match[2].trim() ? match[2].split(",").map((p) => p.trim()) : [] };
    }
    if (lang === "javascript") {
      const match = code.match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
      if (match) return { name: match[1], params: match[2].trim() ? match[2].split(",").map((p) => p.trim()) : [] };
      const arrowMatch = code.match(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([^)]*)\)\s*=>/);
      if (arrowMatch) return { name: arrowMatch[1], params: arrowMatch[2].trim() ? arrowMatch[2].split(",").map((p) => p.trim()) : [] };
      return null;
    }
    if (lang === "cpp") {
      if (/\b(int|void)\s+main\s*\(/.test(code)) return null;
      const match = code.match(/(?:^|[\n;\s])([\w:\<\>\s*&]+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
      if (!match) return null;
      return { name: match[2], params: match[3].trim() ? match[3].split(",").map((p) => p.trim()) : [], returnType: match[1].trim() };
    }
    if (lang === "java") {
      const match = code.match(/(?:public\s+static\s+|public\s+|static\s+)?([A-Za-z_][A-Za-z0-9_<>,\s\[\]]*?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
      if (!match) return null;
      return { name: match[2], params: match[3].trim() ? match[3].split(",").map((p) => p.trim()) : [], returnType: match[1].trim() };
    }
    return null;
  }

  function getCallInfo(signature: Signature | null) {
    if (!signature) return { name: defaultName, args: ["n"], needsInput: true, returnType: undefined };
    const name = signature.name || defaultName;
    const args = signature.params.map((param: string, index: number) => {
      const parts = param.split(/\s+/).filter(Boolean);
      return parts.length ? parts[parts.length - 1].replace(/[&*]/g, "") : `arg${index}`;
    });
    return { name, args, needsInput: args.length > 0, returnType: signature.returnType };
  }

  const signature = parseFunctionSignature(code, lang);
  const callInfo = getCallInfo(signature);

  if (lang === "python") {
    const call = callInfo.args.length === 0 ? `${callInfo.name}()` : `${callInfo.name}(${callInfo.args.join(", ")})`;
    const inputLines = callInfo.needsInput
      ? callInfo.args.map((arg) => `${arg} = int(input())`).join("\n") + "\n"
      : "";
    return `${code}\n\n${inputLines}print(${call})`;
  }

  if (lang === "javascript") {
    const call = callInfo.args.length === 0 ? `${callInfo.name}()` : `${callInfo.name}(${callInfo.args.join(", ")})`;
    const inputLines = callInfo.needsInput
      ? `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin, output: process.stdout });\nconst lines = [];\nrl.on('line', (line) => {\n  lines.push(parseInt(line));\n  if (lines.length === ${callInfo.args.length}) {\n    console.log(${call});\n    rl.close();\n  }\n});`
      : `console.log(${call});`;
    return `${code}\n\n${inputLines}`;
  }

  if (lang === "cpp") {
    const call = callInfo.args.length === 0 ? `${callInfo.name}()` : `${callInfo.name}(${callInfo.args.join(", ")})`;
    const inputLines = callInfo.needsInput
      ? callInfo.args.map((arg) => `  long long ${arg}; cin >> ${arg};`).join("\n")
      : "";
    const returnType = (callInfo.returnType ?? "").toLowerCase();
    const hasInternalOutput = /cout|printf|cerr/.test(code);
    const isVoid = returnType.includes("void") && !hasInternalOutput;
    const outputLine = isVoid ? `${call};` : `cout << ${call};`;
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n${code}\n\nint main() {\n${inputLines}\n  ${outputLine}\n  return 0;\n}`;
  }

  if (lang === "java") {
    const funcName = callInfo.name;
    const call = callInfo.args.length === 0 ? `${funcName}()` : `${funcName}(${callInfo.args.join(", ")})`;
    const inputLines = callInfo.needsInput
      ? callInfo.args.map((arg) => `    long ${arg} = sc.nextLong();`).join("\n") + "\n"
      : "";
    const outputLine = `    System.out.println(${call});`;
    return `import java.util.*;\n\npublic class Main {\n${code}\n\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n${inputLines}    ${outputLine}\n  }\n}`;
  }

  return code;
}

function PracticePage() {
  const start = useServerFn(startPractice);
  const submit = useServerFn(submitPractice);
  const list = useServerFn(listPractice);
  const gen = useServerFn(generatePracticeQuestions);
  const getTests = useServerFn(getOrGenerateTests);
  const runFn = useServerFn(runIdeTests);

  const [topic, setTopic] = useState("arrays");
  const [count, setCount] = useState(3);
  const [diff, setDiff] = useState<"easy"|"medium"|"hard">("medium");
  const [duration, setDuration] = useState(15);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionTests, setQuestionTests] = useState<Array<any | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<any>(null);
  const [remaining, setRemaining] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [runResults, setRunResults] = useState<any[] | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<"editor"|"tests"|"output">("editor");
  const [sidebarWidth, setSidebarWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any>(null);

  const filterPracticeHistory = (sessions: any[]) => {
    return sessions.filter((entry) => !String(entry.title || "").startsWith("Revision"));
  };

  useEffect(() => {
    list().then((r) => setHistory(filterPracticeHistory(r.sessions))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session || summary) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session, summary]);

  useEffect(() => {
    if (!session) return;
    const current = questionTests[activeIndex];
    if (!current && questions[activeIndex]) {
      loadTests(activeIndex);
    }
  }, [activeIndex, session, questions, questionTests]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextWidth = Math.min(Math.max(e.clientX - rect.left, 320), rect.width - 360);
      setSidebarWidth(nextWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!questions.length) return;
    const current = answers[activeIndex] ?? "";
    if (current.trim()) {
      setCode(current);
      return;
    }
    setCode(getStarterCode(questions[activeIndex]?.title ?? "", lang));
  }, [activeIndex, answers, lang, questions]);

  const activeQuestion = questions[activeIndex]?.title ?? "";
  const activeStatement = questions[activeIndex] ?? null;
  const currentTests = questionTests[activeIndex];
  const exampleItems: Array<{ input: string; output: string; explanation: string }> = activeStatement?.examples?.length
    ? activeStatement.examples
    : currentTests?.public?.slice(0, 3).map((test: any) => ({
        input: String(test.input ?? "").trim(),
        output: String(test.expected ?? "").trim(),
        explanation: String(test.explanation ?? "").trim(),
      })) ?? [];
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");

  async function loadTests(index: number) {
    if (!questions[index] || questionTests[index]) return;
    setTestLoading(true);
    try {
      const question = questions[index];
      const r = await getTests({ data: {
        problem_slug: `practice:${question.title}`,
        problem_title: question.title,
        problem_statement: question.statement || question.title,
      } });
      setQuestionTests((prev) => {
        const next = [...prev];
        next[index] = r;
        return next;
      });
      toast.success("Generated test cases for the current question");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate tests");
    } finally {
      setTestLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await gen({ data: { topic, count, difficulty: diff } });
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(""));
      setQuestionTests(new Array(r.questions.length).fill(null));
      setActiveIndex(0);
      toast.success(`Generated ${r.questions.length} practice questions`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStart() {
    if (!questions.length) { toast.error("Generate questions first"); return; }
    setGenerating(true);
    try {
      const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} (${diff})`;
      const r = await start({ data: { title, duration_seconds: duration * 60, file_ids: [], problem_ids: [] } });
      setSession(r.session);
      setRemaining(duration * 60);
      loadTests(0);
      setActiveIndex(0);
      toast.success("Practice session started!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start session");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRun() {
    if (!activeQuestion || !code.trim()) return;
    setRunning(true);
    try {
      const wrapped = wrapFunctionCode(code, lang, activeQuestion);
      const tests = (currentTests?.public ?? []).map((t: any) => ({ input: String(t.input ?? ""), expected: String(t.expected ?? "") }));
      const r = await runFn({ data: { language: lang, source: wrapped, tests } });
      setRunResults(r.results ?? r);
      setTab("output");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to run tests");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!session) return;
    setSubmitting(true);
    try {
      const questionSummaries: PracticeSummary["questionSummaries"] = [];
      for (let i = 0; i < questions.length; i += 1) {
        const question = questions[i];
        const codeAnswer = answers[i] ?? "";
        let tests = questionTests[i];
        if (!tests) {
          try {
            tests = await getTests({ data: {
              problem_slug: `practice:${question.title}`,
              problem_title: question.title,
              problem_statement: question.statement || question.title,
            } });
            setQuestionTests((prev) => {
              const next = [...prev];
              next[i] = tests;
              return next;
            });
          } catch {
            tests = null;
          }
        }

        let testRun = null;
        if (tests && codeAnswer.trim()) {
          try {
            const wrapped = wrapFunctionCode(codeAnswer, lang, question.title);
            testRun = await runFn({ data: { language: lang, source: wrapped, tests: [...tests.public, ...tests.hidden] } });
          } catch (err) {
            console.error("Practice test run error", err);
            testRun = null;
          }
        }

        let analysis = null;
        try {
          analysis = await analyzeComplexity({ data: {
            language: lang,
            source: codeAnswer,
            problem_title: question.title,
            passed: testRun?.passed ?? 0,
            total: testRun?.total ?? 0,
          } });
        } catch {
          analysis = null;
        }

        questionSummaries.push({
          title: question.title,
          statement: question.statement,
          code: codeAnswer,
          testRun,
          analysis,
        });
      }

      const payload = answers.map((answer, index) => ({
        question: questions[index]?.title ?? "",
        answer: answer ?? "",
      }));
      const r = await submit({ data: { session_id: session.id, answers: payload } });
      setSummary({
        score: r.score,
        feedback: r.feedback,
        questionSummaries,
      });
      setSession(null);
      clearInterval(timerRef.current);
      await list().then((lst) => setHistory(filterPracticeHistory(lst.sessions))).catch(() => {});
      toast.success("Practice session submitted!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session && summary) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Practice Summary</h1>
                <p className="text-slate-400 mt-2">Detailed feedback for each question, including passed/failed tests, complexity analysis, and improvement suggestions.</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Score</div>
                <div className="text-4xl font-bold text-emerald-300">{summary.score ?? "—"} / 10</div>
              </div>
            </div>
            <div className="mt-4 text-slate-200 whitespace-pre-wrap">{summary.feedback}</div>
          </div>

          {summary.questionSummaries.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                <div>
                  <div className="text-sm text-slate-500">Question {idx + 1}</div>
                  <h2 className="text-xl font-semibold text-slate-100 mt-1">{item.title}</h2>
                  <p className="text-slate-400 mt-3 whitespace-pre-wrap">{item.statement}</p>
                </div>
                {item.testRun && (
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
                    <div className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Test Result</div>
                    <div className={item.testRun.passed === item.testRun.total ? "text-emerald-300 font-semibold" : "text-amber-300 font-semibold"}>
                      {item.testRun.passed}/{item.testRun.total} passed
                    </div>
                  </div>
                )}
              </div>

              {item.analysis && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-3 text-sm">
                    <div className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Time Complexity</div>
                    <div className="text-slate-100">{item.analysis.time_complexity ?? "Unknown"}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-3 text-sm">
                    <div className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Space Complexity</div>
                    <div className="text-slate-100">{item.analysis.space_complexity ?? "Unknown"}</div>
                  </div>
                  <div className="sm:col-span-2 rounded border border-slate-800 bg-slate-950/50 p-3 text-sm">
                    <div className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Strengths</div>
                    {item.analysis.strengths?.length ? (
                      <ul className="list-disc ml-4 text-slate-200">
                        {item.analysis.strengths.map((s: string, idx2: number) => <li key={idx2}>{s}</li>)}
                      </ul>
                    ) : (
                      <div className="text-slate-500">No strengths available.</div>
                    )}
                  </div>
                  <div className="sm:col-span-2 rounded border border-slate-800 bg-slate-950/50 p-3 text-sm">
                    <div className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Improvements</div>
                    {item.analysis.improvements?.length ? (
                      <ul className="list-disc ml-4 text-slate-200">
                        {item.analysis.improvements.map((s: string, idx2: number) => <li key={idx2}>{s}</li>)}
                      </ul>
                    ) : (
                      <div className="text-slate-500">No improvement suggestions available.</div>
                    )}
                  </div>
                </div>
              )}

              {item.testRun?.results?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-200">Detailed test case results</div>
                  {item.testRun.results.map((r: any, testIdx: number) => (
                    <div key={testIdx} className={`rounded border p-3 text-xs ${r.pass ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
                      <div className="flex items-center justify-between gap-2 font-semibold mb-2">
                        <span>{r.pass ? "Passed" : "Failed"} test {testIdx + 1}</span>
                        {r.time_ms != null && <span className="text-slate-400">{r.time_ms}ms</span>}
                      </div>
                      <div className="space-y-1">
                        <div><span className="text-slate-400">Input:</span> <span className="text-slate-200">{r.input}</span></div>
                        <div><span className="text-slate-400">Expected:</span> <span className="text-slate-200">{r.expected}</span></div>
                        {!r.pass && <div><span className="text-slate-400">Got:</span> <span className="text-slate-200">{r.got}</span></div>}
                        {r.stderr && <div className="text-rose-300 whitespace-pre-wrap mt-2">{r.stderr}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button onClick={() => {
            setSummary(null);
            setQuestions([]);
            setAnswers([]);
            setQuestionTests([]);
            setActiveIndex(0);
            setTab("editor");
          }} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-semibold">Return to practice</button>
        </div>
      </div>
    );
  }

  if (!session && !summary) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl font-bold">Practice</h1>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Topic</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 border border-slate-700">
                  <option>arrays</option><option>strings</option><option>linked-list</option><option>trees</option><option>graphs</option><option>dp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Difficulty</label>
                <select value={diff} onChange={(e) => setDiff(e.target.value as any)} className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 border border-slate-700">
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Question Count</label>
                <input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value))} min="1" max="10" className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 border border-slate-700" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Duration (minutes)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} min="5" max="180" className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 border border-slate-700" />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={generating} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded font-semibold inline-flex items-center justify-center gap-2">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generate Questions
            </button>
          </div>
          {questions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Generated Questions</h2>
              <ol className="space-y-2">
                {questions.map((q, i) => (
                  <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="font-bold text-indigo-400">Q{i+1}.</div>
                    <div className="mt-1 text-slate-200">{q.title}</div>
                    {q.statement ? <div className="mt-2 text-slate-400 text-sm line-clamp-3">{q.statement}</div> : null}
                  </li>
                ))}
              </ol>
              <button onClick={handleStart} disabled={generating} className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded font-bold inline-flex items-center justify-center gap-2 text-lg">
                {generating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />} Start Practice Session
              </button>
            </div>
          )}
          {history.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-lg font-bold mb-3">Practice History</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {history.map((h) => (
                  <div key={h.id} className="rounded border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
                    <div className="font-semibold text-slate-100">{h.title}</div>
                    <div className="text-xs text-slate-500">{new Date(h.started_at).toLocaleString()}</div>
                    <div className="mt-2">{h.ai_score ?? "—"}/10 · {h.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="font-bold text-lg">Practice Session</h1>
          <div className="text-sm text-slate-400">Q{activeIndex + 1} of {questions.length}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Clock size={18} /> {mins}:{secs}
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-slate-800 text-slate-100 rounded px-3 py-1 text-sm border border-slate-700">
            {LANG_OPTS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button onClick={handleRun} disabled={running || !activeQuestion} className="px-3 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded text-sm font-semibold inline-flex items-center gap-2">
            {running ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} Run
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded text-sm font-semibold inline-flex items-center gap-2">
            {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Submit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Problem Description */}
        <div style={{ width: sidebarWidth }} className="min-w-[320px] max-w-[75%] border-r border-slate-800 overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-2">Q{activeIndex + 1}. {activeQuestion}</h2>
            <p className="text-slate-400 text-sm">Problem Statement & Description</p>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Problem Statement</h3>
              <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                {activeStatement?.statement || "No detailed statement available yet. Generate tests or continue with the prompt above."}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Function Signature</h3>
              <div className="bg-slate-900/50 rounded border border-slate-800 p-3">
                <code className="text-xs text-slate-300 font-mono block whitespace-pre-wrap break-words">{getFunctionSignature(activeQuestion, lang)}</code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Constraints</h3>
              <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                {activeStatement?.constraints || "No constraints generated yet. Use reasonable input sizes and edge case handling."}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-100 mb-2">Examples</h3>
              <div className="space-y-2">
                {exampleItems.length > 0 ? exampleItems.map((example, idx: number) => (
                  <div key={idx} className="bg-slate-900/50 rounded border border-slate-800 p-3 text-xs space-y-1">
                    <div className="text-slate-400 font-semibold">Example {idx + 1}</div>
                    <div><span className="text-slate-400">Input:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{example.input}</code></div>
                    <div><span className="text-slate-400">Output:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{example.output}</code></div>
                    {example.explanation && <div className="text-slate-400">{example.explanation}</div>}
                  </div>
                )) : (
                  <button onClick={() => loadTests(activeIndex)} disabled={testLoading} className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-sm inline-flex items-center justify-center gap-2">
                    {testLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} Load Examples
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="flex gap-2 pt-4 border-t border-slate-800">
            <button onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-sm inline-flex items-center justify-center gap-1">
              <ChevronLeft size={14} /> Previous
            </button>
            <button onClick={() => setActiveIndex(Math.min(questions.length - 1, activeIndex + 1))} disabled={activeIndex === questions.length - 1} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-sm inline-flex items-center justify-center gap-1">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="w-1 cursor-col-resize bg-slate-800 hover:bg-slate-700" onMouseDown={() => setIsResizing(true)} />

        {/* Right Panel - Editor & Tabs */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Editor Tabs */}
          <div className="border-b border-slate-800 bg-slate-900/30 flex">
            {(["editor", "tests", "output"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-2 text-sm font-semibold border-b-2 uppercase tracking-widest ${tab === t ? "border-indigo-500 text-slate-100" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {tab === "editor" && (
              <Editor
                language={LANG_OPTS.find((l) => l.key === lang)!.monaco}
                theme="vs-dark"
                value={code}
                onChange={(val) => {
                  setCode(val ?? "");
                  setAnswers((prev) => {
                    const next = [...prev];
                    next[activeIndex] = val ?? "";
                    return next;
                  });
                }}
                options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
              />
            )}

            {tab === "tests" && (
              <div className="overflow-y-auto p-4 space-y-3">
                {!currentTests && !testLoading && (
                  <button onClick={() => loadTests(activeIndex)} disabled={testLoading} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded font-semibold inline-flex items-center justify-center gap-2">
                    {testLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generate Test Cases
                  </button>
                )}
                {testLoading && <div className="text-slate-400">Generating test cases...</div>}
                {currentTests && (
                  <>
                    <div><strong className="text-slate-200">{currentTests.public?.length ?? 0} Public Tests</strong></div>
                    {currentTests.public?.map((test: any, idx: number) => (
                      <div key={idx} className="rounded border border-slate-800 bg-slate-900/50 p-3 space-y-1 text-xs">
                        <div className="font-semibold text-slate-100">Test {idx + 1}</div>
                        <div><span className="text-slate-400">Input:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{test.input}</code></div>
                        <div><span className="text-slate-400">Expected:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{test.expected}</code></div>
                      </div>
                    ))}
                    {currentTests.hidden && currentTests.hidden.length > 0 && (
                      <div className="rounded border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
                        🔒 {currentTests.hidden.length} hidden test cases (will run on submission)
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "output" && (
              <div className="overflow-y-auto p-4 space-y-3">
                {!runResults && <div className="text-slate-400">Run code to see output</div>}
                {runResults?.map((r: any, idx: number) => (
                  <div key={idx} className={`rounded border p-3 text-xs ${r.pass ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      {r.pass ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-rose-400" />}
                      Test {idx + 1}: {r.pass ? "PASSED" : "FAILED"}
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-slate-400">Input:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{r.input}</code></div>
                      <div><span className="text-slate-400">Expected:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{r.expected}</code></div>
                      <div><span className="text-slate-400">Got:</span> <code className="text-slate-200 font-mono block whitespace-pre-wrap">{r.got || r.stderr || "No output"}</code></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
