import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProblems } from "@/lib/problems.functions";
import { Code2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/problems")({
  component: ProblemsPage,
  head: () => ({
    meta: [
      { title: "Coding Problems — CodeLearn AI" },
      { name: "description", content: "Browse and solve LeetCode-style coding problems with hidden test cases, instant grading, and AI-powered hints." },
    ],
  }),
});

const diffColor: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function ProblemsPage() {
  const fn = useServerFn(listProblems);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<string>("all");

  useEffect(() => {
    fn().then((r) => { setRows(r.problems); setLoading(false); }).catch(() => setLoading(false));
  }, [fn]);

  const filtered = rows.filter((p) => {
    if (diff !== "all" && p.difficulty !== diff) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="flex items-center gap-2 font-bold">
            <Code2 size={18} className="text-indigo-400" /> Problems
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">Dashboard →</Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Practice Problems</h1>
          <p className="text-slate-400">Solve coding challenges, get instant grading against hidden tests, build interview-ready muscle memory.</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search problems…"
            className="flex-1 min-w-[200px] rounded bg-slate-900 border border-slate-800 px-3 py-2 text-sm placeholder:text-slate-500"
          />
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="rounded bg-slate-900 border border-slate-800 px-3 py-2 text-sm">
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        {loading ? (
          <div className="text-slate-500 py-12 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-500 py-12 text-center">No problems match your filters.</div>
        ) : (
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3 hidden md:table-cell">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-t border-slate-800 hover:bg-slate-900/40 ${i % 2 ? "bg-slate-900/20" : ""}`}>
                    <td className="px-4 py-3">
                      <Link to="/problems/$slug" params={{ slug: p.slug }} className="text-indigo-400 hover:text-indigo-300 font-medium">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${diffColor[p.difficulty] ?? ""} capitalize`}>{p.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(p.tags ?? []).map((t: string) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{t}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
