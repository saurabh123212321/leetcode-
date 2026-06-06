import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { getProblem, runProblemSamples, submitProblem, listMySubmissions, checkCodeFormat } from "@/lib/problems.functions";
import { getOrGenerateTests } from "@/lib/ide.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Play, Send, Loader2, CheckCircle2, XCircle, Clock, Lightbulb, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/problems/$slug")({
  component: ProblemPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — CodeLearn AI` },
      { name: "description", content: "Solve this coding challenge with instant grading and AI hints." },
    ],
  }),
});

const LANGS = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "go", label: "Go" },
];

const statusColor: Record<string, string> = {
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  wrong_answer: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  runtime_error: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  compile_error: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  tle: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  pending: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

function ProblemPage() {
  const { slug } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const getFn = useServerFn(getProblem);
  const runFn = useServerFn(runProblemSamples);
  const submitFn = useServerFn(submitProblem);
  const checkFormatFn = useServerFn(checkCodeFormat);
  const subsFn = useServerFn(listMySubmissions);

  const [problem, setProblem] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<any[] | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tab, setTab] = useState<"problem" | "tests" | "result" | "summary">("problem");
  const [revealedHints, setRevealedHints] = useState(0);
  const [formatWarnings, setFormatWarnings] = useState<string[]>([]);

  useEffect(() => {
    getFn({ data: { slug } })
      .then((r) => {
        setProblem(r.problem);
        setSamples(r.sample_tests);
        const starter = (r.problem.starter_code ?? {})[language] ?? "";
        setCode(starter);
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load"));
  }, [slug, getFn]); // eslint-disable-line

  useEffect(() => {
    if (!problem) return;
    const starter = (problem.starter_code ?? {})[language] ?? "";
    if (!code.trim()) setCode(starter);
  }, [language]); // eslint-disable-line

  useEffect(() => {
    if (problem?.id && session) subsFn({ data: { problem_id: problem.id } }).then((r) => setSubmissions(r.submissions)).catch(() => {});
  }, [problem?.id, session, subsFn, submitResult]);

  useEffect(() => {
    if (!code.trim() || code.length < 5) {
      setFormatWarnings([]);
      return;
    }
    const timer = setTimeout(() => {
      checkFormatFn({ data: { language, code } })
        .then((r) => setFormatWarnings(r.warnings))
        .catch(() => setFormatWarnings([]));
    }, 500);
    return () => clearTimeout(timer);
  }, [code, language, checkFormatFn]);

  const examples = useMemo(() => {
    if (!problem) return [];
    return Array.isArray(problem.examples) ? problem.examples : [];
  }, [problem]);

  const testsFn = useServerFn(getOrGenerateTests);
  const [generatedTests, setGeneratedTests] = useState<any | null>(null);

  if (!problem) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading…</div>;
  }

  const handleRun = async () => {
    if (!session) { toast.error("Sign in to run code"); navigate({ to: "/login" }); return; }
    setRunning(true);
    setRunResults(null);
    try {
      const r = await runFn({ data: { problem_id: problem.id, language, code } });
      setRunResults(r.results);
    } catch (e: any) {
      toast.error(e?.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const loadTests = async () => {
    if (!problem) return;
    try {
      const r = await testsFn({ data: { problem_slug: problem.slug ?? problem.id, problem_title: problem.title, problem_statement: problem.description } });
      setGeneratedTests(r);
    } catch (e: any) {
      toast.error("Failed to generate tests");
    }
  };

  const handleSubmit = async () => {
    if (!session) { toast.error("Sign in to submit"); navigate({ to: "/login" }); return; }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const r = await submitFn({ data: { problem_id: problem.id, language, code } });
      setSubmitResult(r);
      if (r.status === "accepted") toast.success(`Accepted! ${r.passed}/${r.total} tests passed`);
      else toast.error(`${r.status.replace("_", " ")}: ${r.passed}/${r.total}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/40">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/problems" className="flex items-center gap-2 text-slate-300 hover:text-white text-sm">
            <ArrowLeft size={16} /> All Problems
          </Link>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded border capitalize ${
              problem.difficulty === "easy" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
              problem.difficulty === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
              "text-rose-400 border-rose-500/30 bg-rose-500/10"
            }`}>{problem.difficulty}</span>
            <h1 className="font-bold">{problem.title}</h1>
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">Dashboard →</Link>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: description + tests */}
        <div className="border-r border-slate-800 overflow-y-auto">
          <div className="border-b border-slate-800 px-4 flex gap-2">
            {([
              { key: 'problem', label: 'Problem' },
              { key: 'tests', label: 'Tests' },
              { key: 'result', label: 'Result' },
              { key: 'summary', label: 'Summary' },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${tab === (t.key as any) ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-4">
            {tab === 'problem' && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-[70%]">
                    <div className="text-xs text-slate-400">{submissions.length > 0 ? 'Attempted' : 'Not attempted'}</div>
                    <h2 className="text-xl font-semibold text-slate-100 mt-1">{problem.title}</h2>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded border capitalize ${problem.difficulty === 'easy' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : problem.difficulty === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>{problem.difficulty}</span>
                      {(problem.tags ?? []).slice(0,5).map((t: string) => <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{t}</span>)}
                    </div>
                    <div className="mt-3 prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-200">{problem.description}</div>
                    {problem.hint && (
                      <div className="mt-3 rounded border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-200">
                        <div className="text-slate-400 font-semibold">Hint</div>
                        <div className="mt-1 text-slate-200">{problem.hint}</div>
                      </div>
                    )}
                    {examples.length > 0 && (
                      <div className="mt-3">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Examples</h3>
                        <div className="space-y-2">
                          {examples.map((ex: any, i: number) => (
                            <div key={i} className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs font-mono">
                              <div className="text-slate-400 mb-1">Input:</div>
                              <pre className="text-slate-200 whitespace-pre-wrap">{ex.input}</pre>
                              <div className="text-slate-400 mt-2 mb-1">Output:</div>
                              <pre className="text-emerald-300 whitespace-pre-wrap">{ex.output}</pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {problem.constraints && (
                      <div className="mt-3">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Constraints</h3>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono bg-slate-900/40 rounded border border-slate-800 p-3">{problem.constraints}</pre>
                      </div>
                    )}
                  </div>
                  <div className="w-[28%] space-y-3">
                    <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-sm">
                      <div className="text-slate-400 text-xs">Companies</div>
                      <div className="mt-2 text-xs text-slate-200">{(problem.companies ?? []).slice(0,5).join(', ') || '—'}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/40 p-3 text-sm">
                      <div className="text-slate-400 text-xs">Topics</div>
                      <div className="mt-2 text-xs text-slate-200">{(problem.tags ?? []).slice(0,10).join(', ') || '—'}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {tab === 'tests' && (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300">Tests (Public — up to 5)</h3>
                  <div className="text-xs text-slate-400">{samples.length > 0 ? `${Math.min(samples.length,5)} public tests` : 'No public samples'}</div>
                </div>
                <div className="mt-3 space-y-2">
                  {(samples.length > 0 ? samples.slice(0,5) : (generatedTests?.public ?? []).slice(0,5)).map((t: any, i: number) => (
                    <div key={i} className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs font-mono">
                      <div className="text-slate-400 mb-1">Test {i+1}</div>
                      <div className="text-slate-400 mb-1">Input:</div>
                      <pre className="text-slate-200 whitespace-pre-wrap">{t.stdin ?? t.input ?? ''}</pre>
                      <div className="text-slate-400 mt-2 mb-1">Expected Output:</div>
                      <pre className="text-emerald-300 whitespace-pre-wrap">{t.expected_stdout ?? t.output ?? ''}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === 'result' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Result</h3>
                <div className="mt-3 space-y-3">
                  {submitResult && (
                    <div className={`rounded border p-3 ${statusColor[submitResult.status] ?? ''}`}>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="capitalize">{submitResult.status.replace('_',' ')}</span>
                        <span className="ml-auto text-xs">{submitResult.passed}/{submitResult.total} tests</span>
                      </div>
                      {submitResult.failure && (
                        <div className="mt-2 text-xs font-mono space-y-1">
                          <div className="text-slate-400">Failed test #{submitResult.failure.ordinal + 1}{submitResult.failure.is_sample ? '' : ' (hidden)'}</div>
                          {submitResult.failure.is_sample && (
                            <>
                              <div><span className="text-slate-400">Input:</span> <pre className="inline whitespace-pre-wrap">{submitResult.failure.stdin}</pre></div>
                              <div><span className="text-slate-400">Expected:</span> <pre className="inline whitespace-pre-wrap text-emerald-300">{submitResult.failure.expected}</pre></div>
                              <div><span className="text-slate-400">Got:</span> <pre className="inline whitespace-pre-wrap text-rose-300">{submitResult.failure.got}</pre></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {runResults && (
                    <div>
                      <div className="text-xs text-slate-400">Run results (samples)</div>
                      <div className="mt-2 space-y-2">
                        {runResults.map((r, i) => (
                          <div key={i} className={`rounded border p-2 text-xs font-mono ${r.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span>Test {i+1}: {r.passed ? 'Passed' : 'Failed'}</span>
                              {r.time && <span className="ml-auto text-slate-500">{(r.time*1000).toFixed(0)}ms</span>}
                            </div>
                            {!r.passed && (
                              <div className="space-y-1 text-slate-400">
                                <div>Input: <span className="text-slate-200">{r.stdin}</span></div>
                                <div>Expected: <span className="text-emerald-300">{r.expected}</span></div>
                                <div>Got: <span className="text-rose-300">{r.got || '(empty)'}</span></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === 'summary' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Summary / Editorial</h3>
                <div className="mt-3 prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-200">{problem.editorial ?? 'No editorial available.'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor + results */}
        <div className="flex flex-col min-h-0">
          <div className="border-b border-slate-800 px-3 py-2 flex items-center gap-2 bg-slate-900/30">
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="rounded bg-slate-900 border border-slate-800 px-2 py-1 text-sm">
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <button onClick={handleRun} disabled={running || submitting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
              </button>
              <button onClick={handleSubmit} disabled={running || submitting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] flex flex-col">
            {!code.trim() && (
              <div className="bg-blue-900/20 border-b border-blue-500/30 p-3 text-xs text-blue-200">
                <div className="font-semibold mb-2">📝 Starter Code Template (Click "Load" to start)</div>
                <details className="cursor-pointer">
                  <summary className="font-semibold hover:text-blue-100">Show starter template for {language}</summary>
                  <div className="mt-2 bg-slate-900/60 rounded p-2 font-mono text-[11px] whitespace-pre-wrap border border-slate-700">
{language === "python" ? `# Read clean input
n = int(input())

# Your code here
result = n  # Replace with actual logic

# Output result (no prompts)
print(result)` : language === "cpp" ? `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Replace with the required method, e.g.
    // vector<int> twoSum(vector<int>& nums, int target) { }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; ++i) cin >> nums[i];
    int target; cin >> target;
    Solution sol;
    // auto res = sol.twoSum(nums, target);
    // Print result according to problem's expected format
    cout << "" << endl;
    return 0;
}` : language === "java" ? `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();  // Read input
        
        // Your code here
        int result = n;  // Replace with actual logic
        
        System.out.println(result);  // Output only result
    }
}` : language === "javascript" ? `const input = require('fs').readFileSync(0, 'utf-8').trim();
const n = parseInt(input, 10);

// Your code here
const result = n;  // Replace with actual logic

console.log(result);  // Output only result` : `// Starter template for ${language}`}
                  </div>
                  <button onClick={() => {
                    const templates: Record<string, string> = {
                      python: `# Read clean input\nn = int(input())\n\n# Your code here\nresult = n  # Replace with actual logic\n\n# Output result (no prompts)\nprint(result)`,
                      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Replace with the required method, e.g.\n    // vector<int> twoSum(vector<int>& nums, int target) { }\n};\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for (int i = 0; i < n; ++i) cin >> nums[i];\n    int target; cin >> target;\n    Solution sol;\n    // auto res = sol.twoSum(nums, target);\n    // Print result according to problem's expected format\n    cout << "" << endl;\n    return 0;\n}`,
                      java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();  // Read input\n        \n        // Your code here\n        int result = n;  // Replace with actual logic\n        \n        System.out.println(result);  // Output only result\n    }\n}`,
                      javascript: `const input = require('fs').readFileSync(0, 'utf-8').trim();\nconst n = parseInt(input, 10);\n\n// Your code here\nconst result = n;  // Replace with actual logic\n\nconsole.log(result);  // Output only result`,
                    };
                    setCode(templates[language] || templates.python);
                  }} className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                    Load Template
                  </button>
                </details>
              </div>
            )}
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
            />
          </div>
          <div className="border-t border-slate-800 bg-slate-900/40 max-h-[40vh] overflow-y-auto">
            <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">Console & Warnings</div>
            <div className="p-3 space-y-2 text-sm">
              {formatWarnings.length > 0 && (
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <AlertCircle size={16} />
                    Output Format Warning
                  </div>
                  {formatWarnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-200">{w}</div>
                  ))}
                </div>
              )}
              {submitResult && (
                <div className={`rounded border p-3 ${statusColor[submitResult.status] ?? ""}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {submitResult.status === "accepted" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span className="capitalize">{submitResult.status.replace("_", " ")}</span>
                    <span className="ml-auto text-xs flex items-center gap-2">
                      <span>{submitResult.passed}/{submitResult.total} tests</span>
                      {submitResult.runtime_ms != null && <span className="flex items-center gap-1"><Clock size={12} />{Math.round(submitResult.runtime_ms)}ms</span>}
                    </span>
                  </div>
                  {submitResult.failure && (
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-slate-400">Failed test #{submitResult.failure.ordinal + 1}{submitResult.failure.is_sample ? "" : " (hidden)"}</div>
                      {submitResult.failure.is_sample && (
                        <>
                          <div><span className="text-slate-400">Input:</span> <pre className="inline whitespace-pre-wrap">{submitResult.failure.stdin}</pre></div>
                          <div><span className="text-slate-400">Expected:</span> <pre className="inline whitespace-pre-wrap text-emerald-300">{submitResult.failure.expected}</pre></div>
                          <div><span className="text-slate-400">Got:</span> <pre className="inline whitespace-pre-wrap text-rose-300">{submitResult.failure.got}</pre></div>
                        </>
                      )}
                      {submitResult.failure.stderr && <div className="text-rose-300 whitespace-pre-wrap">{submitResult.failure.stderr}</div>}
                    </div>
                  )}
                </div>
              )}
              {runResults && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">Sample test results</div>
                  {runResults.map((r, i) => (
                    <div key={i} className={`rounded border p-2 text-xs font-mono ${r.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {r.passed ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-rose-400" />}
                        <span className={r.passed ? "text-emerald-300" : "text-rose-300"}>Test {i + 1}: {r.passed ? "Passed" : "Failed"}</span>
                        {r.time && <span className="ml-auto text-slate-500">{(r.time * 1000).toFixed(0)}ms</span>}
                      </div>
                      {!r.passed && (
                        <div className="space-y-1 text-slate-400">
                          <div>Input: <span className="text-slate-200">{r.stdin}</span></div>
                          <div>Expected: <span className="text-emerald-300">{r.expected}</span></div>
                          <div>Got: <span className="text-rose-300">{r.got || "(empty)"}</span></div>
                          {r.stderr && <div className="text-rose-300 whitespace-pre-wrap">{r.stderr}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!runResults && !submitResult && (
                <div className="text-slate-500 text-xs">Click <span className="text-slate-300">Run</span> to test against sample cases, or <span className="text-slate-300">Submit</span> to grade against all hidden tests.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
