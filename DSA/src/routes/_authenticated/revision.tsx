import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import Editor from "@monaco-editor/react";
import { getRevisionFiles, startRevisionSession, submitRevisionSession, listRevisionSessions, generateProblemStatementAI } from "@/lib/revision.functions";
import { getOrGenerateTests, runIdeTests, analyzeComplexity } from "@/lib/ide.functions";
import { toast } from "sonner";
import { Clock, Play, Send, Loader2, Lock, Sparkles, ArrowLeft, CheckCircle2, XCircle, TerminalSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/revision")({
  component: RevisionPage,
  head: () => ({ meta: [{ title: "Revision Test — CodeLearn AI" }] }),
});

const COLORS = [
  { key: "red", label: "🔴 Red (need most revision)", dot: "bg-red-500" },
  { key: "yellow", label: "🟡 Yellow (medium)", dot: "bg-yellow-400" },
  { key: "green", label: "🟢 Green (confident)", dot: "bg-emerald-500" },
  { key: "blue", label: "🔵 Blue", dot: "bg-blue-500" },
  { key: "purple", label: "🟣 Purple", dot: "bg-purple-500" },
] as const;

function humanizeFileName(name: string) {
  const trimmed = name.replace(/\.\s*$/, "").replace(/^\d+\.\s*/, "");
  const base = trimmed.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// Generate function signature based on problem type
function getFunctionSignature(name: string, lang: Lang): string {
  const lower = name.toLowerCase();

  if (/sum.*digit|digit.*sum|sum of digits/.test(lower)) {
    if (lang === "python") return "def sumOfDigits(n: int) -> int:";
    if (lang === "javascript") return "function sumOfDigits(n) {";
    if (lang === "cpp") return "long long sumOfDigits(long long n) {";
    if (lang === "java") return "public static long sumOfDigits(long n) {";
  } else if (/fibonacci/.test(lower)) {
    if (lang === "python") return "def fibonacci(n: int) -> int:";
    if (lang === "javascript") return "function fibonacci(n) {";
    if (lang === "cpp") return "long long fibonacci(long long n) {";
    if (lang === "java") return "public static long fibonacci(long n) {";
  } else if (/prime|prime check/.test(lower)) {
    if (lang === "python") return "def isPrime(n: int) -> str:";
    if (lang === "javascript") return "function isPrime(n) {";
    if (lang === "cpp") return "string isPrime(long long n) {";
    if (lang === "java") return "public static String isPrime(long n) {";
  }

  return lang === "python" ? "def solve(n):" : `function solve(n) {`;
}

// Wrap user function code with boilerplate for execution
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
    if (!signature) return { name: defaultName, args: ["n"], needsInput: true };
    const name = signature.name || defaultName;
    const args = signature.params.map((param, index) => {
      const parts = param.split(/\s+/).filter(Boolean);
      return parts.length ? parts[parts.length - 1].replace(/[&*]/g, "") : `arg${index}`;
    });
    return { name, args, needsInput: args.length > 0, returnType: signature.returnType };
  }

  const signature = parseFunctionSignature(code, lang);
  const callInfo = getCallInfo(signature);
  const hasMain = /\b(int|void)\s+main\s*\(/.test(code);

  if (hasMain) return code;

  if (lang === "python") {
    const funcName = signature?.name ?? defaultName;
    const call = callInfo.args.length === 0 ? `${funcName}()` : `${funcName}(${callInfo.args.join(", ")})`;
    // Improved input parsing: handle both newline and space separated values
    const inputBlock = callInfo.needsInput
      ? callInfo.args.length > 1
        ? `import sys\nargs = sys.stdin.read().strip().split()\n${callInfo.args.map((arg, i) => `${arg} = int(args[${i}]) if len(args) > ${i} else 0`).join("\n")}\n`
        : `n = int(input().strip())\n`
      : "";
    return `${code}\n\n${inputBlock}print(${call})`;
  }

  if (lang === "javascript") {
    const funcName = signature?.name ?? defaultName;
    const call = callInfo.args.length === 0 ? `${funcName}()` : `${funcName}(${callInfo.args.join(", ")})`;
    // Improved input parsing: handle both newline and space separated values
    const inputBlock = callInfo.needsInput
      ? callInfo.args.length > 1
        ? `const input = require('fs').readFileSync(0, 'utf-8').trim().split(/\s+/);\n${callInfo.args.map((arg, i) => `const ${arg} = parseInt(input[${i}], 10) || 0;`).join("\n")}\n`
        : `const input = require('fs').readFileSync(0, 'utf-8').trim();\nconst n = parseInt(input, 10);\n`
      : "";
    return `${code}\n\n${inputBlock}console.log(${call});`;
  }

  if (lang === "cpp") {
    const funcName = signature?.name ?? defaultName;
    const call = callInfo.args.length === 0 ? `${funcName}()` : `${funcName}(${callInfo.args.join(", ")})`;
    // Improved input parsing: support both space and newline separated values
    const inputLines = callInfo.needsInput
      ? callInfo.args.length > 1
        ? callInfo.args.map((arg, idx) => `  long long ${arg}; cin >> ${arg};${idx < callInfo.args.length - 1 ? "" : ""}`).join(" ")
        : `  long long ${callInfo.args[0]}; cin >> ${callInfo.args[0]};`
      : "";
    const returnType = callInfo.returnType?.toLowerCase() ?? "";
    // Fix: Check if function returns void AND has no cout statements (improved void detection)
    const hasInternalOutput = /cout|printf|cerr/.test(code);
    const isVoid = returnType.includes("void") && !hasInternalOutput;
    const outputLine = isVoid ? `${call};` : `cout << ${call};`;
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n${code}\n\nint main() {\n${inputLines}\n  ${outputLine}\n  return 0;\n}`;
  }

  if (lang === "java") {
    const funcName = signature?.name ?? defaultName;
    const call = callInfo.args.length === 0 ? `${funcName}()` : `${funcName}(${callInfo.args.join(", ")})`;
    const inputLines = callInfo.needsInput
      ? callInfo.args.map((arg) => `    long ${arg} = sc.nextLong();`).join("\n") + "\n"
      : "";
    const outputLine = `    System.out.println(${call});`;
    return `import java.util.*;\n\npublic class Main {\n${code}\n\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n${inputLines}    ${outputLine}\n  }\n}`;
  }

  return code;
}

type Color = typeof COLORS[number]["key"];
type FileRow = { id: string; name: string; language: string; content: string; color_tag: string };
type Lang = "python" | "javascript" | "cpp" | "java";

const LANG_OPTS: { key: Lang; label: string; monaco: string; starter: (n: string, lang: Lang) => string }[] = [
  { 
    key: "python", 
    label: "Python", 
    monaco: "python", 
    starter: (name: string) => {
      const sig = getFunctionSignature(name, "python");
      return `${sig}\n    # Write your function here\n    pass\n`;
    }
  },
  { 
    key: "javascript", 
    label: "JavaScript", 
    monaco: "javascript", 
    starter: (name: string) => {
      const sig = getFunctionSignature(name, "javascript");
      return `${sig}\n  // Write your function here\n}\n`;
    }
  },
  { 
    key: "cpp", 
    label: "C++", 
    monaco: "cpp", 
    starter: (name: string) => {
      const sig = getFunctionSignature(name, "cpp");
      return `${sig}\n  // Write your function here\n}\n`;
    }
  },
  { 
    key: "java", 
    label: "Java", 
    monaco: "java", 
    starter: (name: string) => {
      const sig = getFunctionSignature(name, "java");
      return `  ${sig}\n    // Write your function here\n  }\n`;
    }
  },
];

function detectLang(name: string, declared: string): Lang {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py" || declared === "python") return "python";
  if (ext === "js" || ext === "ts" || declared === "javascript" || declared === "typescript") return "javascript";
  if (ext === "cpp" || ext === "cc" || ext === "cxx" || ext === "c" || declared === "cpp" || declared === "c++") return "cpp";
  if (ext === "java" || declared === "java") return "java";
  return "python";
}

function RevisionPage() {
  const loadFiles = useServerFn(getRevisionFiles);
  const startFn = useServerFn(startRevisionSession);
  const submitFn = useServerFn(submitRevisionSession);
  const listFn = useServerFn(listRevisionSessions);
  const genTests = useServerFn(getOrGenerateTests);
  const runFn = useServerFn(runIdeTests);
  const analyzeFn = useServerFn(analyzeComplexity);
  const genProblemFn = useServerFn(generateProblemStatementAI);

  // setup
  const [color, setColor] = useState<Color>("red");
  const [duration, setDuration] = useState(30);
  const [pool, setPool] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // active session
  const [session, setSession] = useState<any>(null);
  const [activeFile, setActiveFile] = useState<FileRow | null>(null);
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState<string>("");
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  // problem data (AI-generated)
  const [problemData, setProblemData] = useState<{ title: string; description: string; functionSig: string; constraints: string; examples: any[] } | null>(null);

  // tests
  const [tests, setTests] = useState<{ public: any[]; hidden: any[] } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [tab, setTab] = useState<"problem" | "tests" | "result" | "summary">("problem");

  // post-submit summary
  const [summary, setSummary] = useState<{ score: number | null; feedback: string; files: any[]; analysis: any } | null>(null);

  async function refreshPool(c: Color = color) {
    setLoading(true);
    try {
      const r = await loadFiles({ data: { color: c } });
      setPool(r.files as any);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function generateTestsForFile(file: FileRow, autoGenerate: boolean = false) {
    if (!file) return;
    setGenLoading(true);
    try {
      // Generate AI-based test cases only
      const r = await genTests({ data: {
        problem_slug: `revision:${file.id}`,
        problem_title: file.name,
        problem_statement: `Generate comprehensive diverse test cases for this ${file.language} program.

IMPORTANT: Extract ONLY stdin and expected stdout values. Ignore any interactive prompts.
Generate 5-10 test cases covering various scenarios including edge cases and boundary conditions.

For each test case, provide:
1. input: the raw input values
2. expected: the expected output

Reference solution:
${(file.content || "").slice(0, 2000)}`,
        color: color,
      } });
      
      setTests(r);
      setTab("tests");
      if (autoGenerate) {
        toast.success(`✨ Generated ${r.public.length} public + ${r.hidden.length} hidden tests via AI!`);
      } else {
        toast.success(`Generated ${r.public.length} public + ${r.hidden.length} hidden tests via AI!`);
      }
    } catch (e: any) { 
      // AI generation failed
      toast.error("Failed to generate test cases. Please try again.");
      console.error("Test generation failed:", e);
    } finally { 
      setGenLoading(false); 
    }
  }

  useEffect(() => { refreshPool(color); /* eslint-disable-next-line */ }, [color]);
  useEffect(() => { listFn().then((r) => setHistory(r.sessions)).catch(() => {}); }, []);

  useEffect(() => {
    if (!session || summary) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [session, summary]);

  async function handleStart(file: FileRow) {
    try {
      const detected = detectLang(file.name, file.language);
      
      // Start session in parallel with AI generation
      const [sessionData, problemStatement] = await Promise.all([
        startFn({ data: { color, duration_seconds: duration * 60, file_ids: [file.id] } }),
        genProblemFn({ data: { 
          file_name: file.name, 
          file_content: file.content || "", 
          language: detected 
        } }).catch(err => {
          console.error("Problem generation failed:", err);
          return null;
        })
      ]);
      
      setSession(sessionData.session);
      setActiveFile(file);
      setLang(detected);
      setCode(LANG_OPTS.find((l) => l.key === detected)!.starter(file.name, detected));
      setRemaining(duration * 60);
      setRunResult(null);
      setSummary(null);
      
      // Set problem data if AI generation succeeded
      if (problemStatement) {
        setProblemData({
          title: problemStatement.title,
          description: problemStatement.description,
          functionSig: problemStatement.functionSig || getFunctionSignature(file.name, detected),
          constraints: problemStatement.constraints,
          examples: problemStatement.examples || [],
        });
        toast.success("✨ Problem statement generated via AI");
        
        // Use test cases from problem statement if available
        if (problemStatement.testCases?.public?.length > 0 || problemStatement.testCases?.hidden?.length > 0) {
          setTests(problemStatement.testCases);
          toast.success(`✨ Test cases generated (${problemStatement.testCases.public.length} public + ${problemStatement.testCases.hidden.length} hidden)`);
        } else {
          // Only call generateTestsForFile if tests weren't returned
          setTests(null);
          generateTestsForFile(file, true).catch(() => {
            toast.warning("⚠️ Could not auto-generate test cases. Click 'Generate Tests' to try again.");
          });
        }
      } else {
        // Fallback: show error but allow user to continue
        setProblemData({
          title: file.name.replace(/\.\w+$/, ""),
          description: "Unable to generate problem statement via AI. Please check your file content.",
          functionSig: getFunctionSignature(file.name, detected),
          constraints: "See your file for specifications",
          examples: [],
        });
        toast.warning("⚠️ Problem statement generation failed. Showing template.");
        setTests(null);
      }
      
      setTab("problem");
    } catch (e: any) { 
      toast.error(`Error starting revision: ${e.message}`);
    }
  }

  async function handleGenerateTests() {
    if (!activeFile) return;
    await generateTestsForFile(activeFile, false);
  }

  async function handleRun() {
    if (!tests) { toast.error("Generate test cases first"); return; }
    setRunning(true);
    setTab("result");
    try {
      // Wrap user function code with boilerplate
      const wrappedCode = wrapFunctionCode(code, lang, activeFile?.name || "");
      const r = await runFn({ data: { language: lang, source: wrappedCode, tests: tests.public } });
      setRunResult(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setRunning(false); }
  }

  async function handleSubmit() {
    if (!session || submitting) return;
    setSubmitting(true);
    setTab("summary");
    try {
      let testRun: any = null;
      if (tests) {
        try {
          // Wrap user function code with boilerplate before testing
          const wrappedCode = wrapFunctionCode(code, lang, activeFile?.name || "");
          testRun = await runFn({ data: { language: lang, source: wrappedCode, tests: [...tests.public, ...tests.hidden] } });
        } catch {}
      }
      const passed = testRun?.passed ?? 0;
      const total = testRun?.total ?? 0;

      const [graded, analysis] = await Promise.all([
        submitFn({ data: {
          session_id: session.id,
          answers: [{
            file_id: activeFile!.id,
            file_name: activeFile!.name,
            original_code: activeFile!.content || "",
            user_code: code,
          }],
        } }),
        analyzeFn({ data: {
          language: lang,
          source: code,
          problem_title: activeFile!.name,
          passed, total,
        } }).catch(() => null),
      ]);

      setSummary({ ...graded, analysis: { ...(analysis ?? {}), testRun }, testRun });
      toast.success("Submitted — see your summary below");
      const lst = await listFn(); setHistory(lst.sessions);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  function backToSetup() {
    setSession(null); setActiveFile(null); setCode(""); setTests(null); setRunResult(null); setSummary(null); setRemaining(0);
  }

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");

  // ============ SETUP SCREEN ============
  if (!session) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Revision Test</h1>
          <p className="text-sm text-slate-400">Pick a color tag, choose a question, then write your solution in the IDE — <span className="inline-flex items-center gap-1 text-amber-300"><Lock size={12}/> no AI assistance during the test</span>. Generate AI test cases, run them, then submit for a full review.</p>
          <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200 space-y-2">
            <p><strong>📋 Revision format:</strong> Treat this like a LeetCode-style coding problem. Read from stdin and write only the expected output to stdout.</p>
            <p><strong>Important:</strong> Do not print interactive prompts or any extra text.</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Color tag:</span>
            {COLORS.map((c) => (
              <button key={c.key} onClick={() => setColor(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${color === c.key ? "bg-slate-700 text-white ring-1 ring-indigo-500" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-slate-400">Duration (min):</label>
            <input type="number" min={1} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)}
              className="w-20 bg-slate-800 text-slate-100 rounded px-2 py-1 text-sm border border-slate-700" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50">
          <div className="px-4 py-2 border-b border-slate-800 text-sm text-slate-300">
            Questions tagged <strong className="capitalize">{color}</strong> ({pool.length}) — click <em>Start in IDE</em> to begin
          </div>
          {loading ? (
            <div className="p-4 text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : pool.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">
              No files tagged "{color}" yet. Tag files in your Workspace with this color first.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 max-h-[480px] overflow-auto">
              {pool.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-800/40">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 truncate">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.language} · {(f.content || "").length} chars</div>
                  </div>
                  <button onClick={() => handleStart(f)}
                    className="rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
                    <Play size={12} /> Start in IDE
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-sm font-semibold text-slate-200 mb-2">Revision history</div>
            <ul className="space-y-1 text-sm text-slate-400">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span className="truncate">{h.title}</span>
                  <span className="shrink-0">{h.ai_score ?? "—"}/10 · {h.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ============ IDE SCREEN ============
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={backToSetup} className="rounded p-1 hover:bg-slate-800" title="Back">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{activeFile?.name}</div>
            <div className="text-[11px] text-slate-500 inline-flex items-center gap-1"><Lock size={10}/> AI locked until submit</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={lang} onChange={(e) => { const nl = e.target.value as Lang; setLang(nl); setCode(LANG_OPTS.find(l=>l.key===nl)!.starter(activeFile?.name ?? "", nl)); }}
            className="bg-slate-800 text-slate-100 text-xs rounded px-2 py-1 border border-slate-700">
            {LANG_OPTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <div className="font-mono text-amber-300 inline-flex items-center gap-1"><Clock size={14}/> {mins}:{secs}</div>
          <button onClick={handleGenerateTests} disabled={genLoading || !!summary}
            className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-50">
            {genLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Generate Tests
          </button>
          <button onClick={handleRun} disabled={running || !tests || !!summary}
            className="rounded bg-slate-700 hover:bg-slate-600 text-white text-xs px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-50">
            {running ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>} Run
          </button>
          <button onClick={handleSubmit} disabled={submitting || !!summary}
            className="rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-50">
            {submitting ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Submit
          </button>
        </div>
      </div>

      {/* body: editor + panel */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        <div className="border-r border-slate-800 min-h-[40vh]">
          <Editor
            height="100%"
            language={LANG_OPTS.find(l=>l.key===lang)!.monaco}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true, readOnly: !!summary }}
          />
        </div>

        <div className="flex flex-col min-h-[40vh]">
          <div className="flex gap-1 border-b border-slate-800 bg-slate-900/40 text-xs">
            {(["problem","tests","result","summary"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 capitalize ${tab===t ? "bg-slate-950 text-white border-b-2 border-indigo-500" : "text-slate-400 hover:text-slate-200"}`}>
                {t}{t==="tests" && tests ? ` (${tests.public.length})` : ""}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-3 text-sm">
            {tab === "problem" && (
              <div className="space-y-4">
                <div className="text-base font-semibold">{problemData?.title || "Loading problem..."}</div>
                <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-4">
                  <div className="space-y-2">
                    <p className="text-slate-300">{problemData?.description || "Generating problem description..."}</p>
                    <div>
                      <div className="text-slate-100 font-semibold">Function Signature</div>
                      <pre className="bg-slate-950/50 p-2 rounded text-amber-200 text-[11px] overflow-x-auto">{problemData?.functionSig || "Generating function signature..."}</pre>
                    </div>
                    <div>
                      <div className="text-slate-100 font-semibold">Constraints</div>
                      <p className="text-slate-400 whitespace-pre-line">{problemData?.constraints || "Generating constraints..."}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-slate-100 font-semibold">Examples</div>
                    <div className="space-y-2">
                      {(problemData?.examples || []).map((ex, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <div className="text-slate-500">Input</div>
                            <pre className="whitespace-pre-wrap text-slate-200">{ex.input}</pre>
                          </div>
                          <div>
                            <div className="text-slate-500">Output</div>
                            <pre className="whitespace-pre-wrap text-slate-200">{ex.output}</pre>
                          </div>
                          <div className="col-span-2 text-slate-500 text-[10px]">{ex.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-200 space-y-2">
                  <div><strong>💡 LeetCode-style coding:</strong> Write ONLY the function body as shown in the function signature above.</div>
                  <div><strong>✅ What to do:</strong> Implement the function logic. The IDE will auto-generate the boilerplate code to handle input/output.</div>
                  <div><strong>❌ What NOT to do:</strong> Don't include main(), headers, namespaces, or input prompts. Just write the function!</div>
                </div>
                {summary && activeFile && (
                  <details className="rounded border border-slate-800 bg-slate-900/60 p-2">
                    <summary className="cursor-pointer text-xs text-slate-300">Show original code (revealed after submit)</summary>
                    <pre className="text-xs whitespace-pre-wrap mt-2 text-slate-200">{activeFile.content}</pre>
                  </details>
                )}
              </div>
            )}
            {tab === "tests" && (
              <div className="space-y-2">
                {!tests && <div className="text-slate-400">No tests yet. Click <strong>Generate Tests</strong>.</div>}
                {tests && (
                  <>
                    <div className="text-xs text-slate-400 mb-3 p-2 bg-slate-900/50 rounded">
                      📊 Total: {tests.public.length} public test cases (shown below) + {tests.hidden.length} hidden test cases (run on submit)
                    </div>
                    {tests.public.map((t: any, i: number) => (
                      <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-2 text-xs">
                        <div className="text-slate-400 mb-1 font-semibold">Test {i+1}{t.explanation ? ` — ${t.explanation}` : ""}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold">Input</div>
                            <pre className="whitespace-pre-wrap text-slate-200 bg-slate-950/50 p-1 rounded text-[11px]">{t.input}</pre>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold">Expected Output</div>
                            <pre className="whitespace-pre-wrap text-slate-200 bg-slate-950/50 p-1 rounded text-[11px]">{t.expected}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {tab === "result" && (
              <div className="space-y-2">
                {running && <div className="text-slate-400 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Running…</div>}
                {!running && !runResult && <div className="text-slate-400">Run public tests to see results here.</div>}
                {runResult && (
                  <>
                    {runResult.compile_output && (
                      <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 mb-3 text-xs text-rose-100">
                        <div className="font-semibold text-rose-200">Compiler / runtime diagnostics</div>
                        <pre className="whitespace-pre-wrap text-[11px] mt-1">{runResult.compile_output}</pre>
                      </div>
                    )}
                    <div className="text-sm">Passed <strong className={runResult.passed === runResult.total ? "text-emerald-400" : "text-amber-300"}>{runResult.passed}/{runResult.total}</strong></div>
                    {runResult.results.map((r: any, i: number) => (
                      <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1">
                            {r.pass ? <CheckCircle2 size={12} className="text-emerald-400"/> : <XCircle size={12} className="text-rose-400"/>}
                            Test {i+1} — {r.status}
                          </span>
                          <span className="text-slate-500">{r.time_ms != null ? `${r.time_ms}ms` : ""}</span>
                        </div>
                        {!r.pass && (
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <div><div className="text-[10px] text-slate-500">Expected</div><pre className="whitespace-pre-wrap text-slate-200">{r.expected}</pre></div>
                            <div><div className="text-[10px] text-slate-500">Got</div><pre className="whitespace-pre-wrap text-slate-200">{r.got}</pre></div>
                          </div>
                        )}
                        {r.stderr && <pre className="mt-1 text-rose-300 whitespace-pre-wrap">{r.stderr}</pre>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {tab === "summary" && (
              <div className="space-y-3">
                {submitting && <div className="text-slate-400 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Grading & analyzing…</div>}
                {summary && (
                  <>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <div className="text-2xl font-bold text-emerald-300">Score: {summary.score ?? "—"} / 10</div>
                      {summary.analysis?.testRun && (
                        <div className="text-xs text-slate-300 mt-1">
                          Tests passed: <strong>{summary.analysis.testRun.passed}/{summary.analysis.testRun.total}</strong>
                        </div>
                      )}
                    </div>
                    {summary.analysis && (
                      <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-1">
                        <div className="font-semibold text-slate-200 inline-flex items-center gap-1"><TerminalSquare size={12}/> Complexity & Review</div>
                        <div>Time: <span className="text-indigo-300">{summary.analysis.time_complexity ?? "?"}</span> · Space: <span className="text-indigo-300">{summary.analysis.space_complexity ?? "?"}</span> {summary.analysis.rating != null && <>· Rating: <strong>{summary.analysis.rating}/10</strong></>}</div>
                        {summary.analysis.strengths?.length > 0 && (
                          <div><div className="text-emerald-300">Strengths</div><ul className="list-disc ml-4">{summary.analysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                        )}
                        {summary.analysis.improvements?.length > 0 && (
                          <div><div className="text-amber-300">Improvements</div><ul className="list-disc ml-4">{summary.analysis.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                        )}
                        {summary.analysis.optimal_approach && (
                          <div><div className="text-slate-300">Optimal approach</div><p className="text-slate-400">{summary.analysis.optimal_approach}</p></div>
                        )}
                      </div>
                    )}
                    {(summary.testRun ?? summary.analysis?.testRun) && (() => {
                      const finalTestRun = summary.testRun ?? summary.analysis?.testRun;
                      const failedResults = finalTestRun.results?.filter((r: any) => !r.pass) ?? [];
                      return (
                        <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-3">
                          <div className="font-semibold text-slate-200">Test run summary</div>
                          <div className="text-slate-300">Passed <strong className={finalTestRun.passed === finalTestRun.total ? "text-emerald-400" : "text-amber-300"}>{finalTestRun.passed}/{finalTestRun.total}</strong></div>
                          {failedResults.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-amber-300">Failed test cases</div>
                              {failedResults.map((r: any, i: number) => (
                                <div key={i} className="rounded border border-rose-500/20 bg-rose-500/5 p-2">
                                  <div className="text-[10px] text-slate-400 font-semibold">Test {r.index ?? i + 1}</div>
                                  <div className="grid grid-cols-2 gap-2 mt-1 text-[10px]">
                                    <div>
                                      <div className="text-slate-500">Input</div>
                                      <pre className="whitespace-pre-wrap text-slate-200">{r.input}</pre>
                                    </div>
                                    <div>
                                      <div className="text-slate-500">Expected</div>
                                      <pre className="whitespace-pre-wrap text-slate-200">{r.expected}</pre>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-[10px]"><span className="text-slate-500">Got</span><pre className="whitespace-pre-wrap text-slate-200">{r.got}</pre></div>
                                  {r.stderr && <pre className="mt-1 text-rose-300 whitespace-pre-wrap">{r.stderr}</pre>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-emerald-300">✅ This submission passed all test cases.</div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-xs font-semibold text-slate-200 mb-1">Submitted code</div>
                      <pre className="text-xs whitespace-pre-wrap text-slate-300">{code}</pre>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-xs font-semibold text-slate-200 mb-1">Interviewer feedback</div>
                      <pre className="text-xs whitespace-pre-wrap text-slate-300">{summary.feedback}</pre>
                    </div>
                    <button onClick={backToSetup} className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5">New revision session</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
