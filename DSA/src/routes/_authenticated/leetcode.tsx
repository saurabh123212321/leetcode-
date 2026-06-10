import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cwStats, cwList } from "@/lib/companywise.functions";
import { ExternalLink, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leetcode")({
  component: LeetCodePage,
  head: () => ({ meta: [{ title: "LeetCode Browser — CodeLearn AI" }] }),
});

const diffColor: Record<string, string> = {
  Easy: "text-emerald-400",
  Medium: "text-amber-400",
  Hard: "text-rose-400",
};

const PAGE = 50;

function LeetCodePage() {
  const statsFn = useServerFn(cwStats);
  const listFn = useServerFn(cwList);
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [diff, setDiff] = useState<"" | "Easy" | "Medium" | "Hard">("");
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; companies: string[] } | null>(null);

  async function load(nextSkip = skip) {
    setLoading(true); setErr(null);
    try {
      const r = await listFn({ data: {
        limit: PAGE, offset: nextSkip,
        difficulty: diff || undefined,
        search: search || undefined,
        company: company || undefined,
        topic: topic || undefined,
      } });
      setRows(r.rows); setTotal(r.total); setSkip(nextSkip);
    } catch (e: any) { setErr(e?.message ?? "Failed"); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { statsFn().then(setStats).catch(() => {}); load(0); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-slate-500">Company-wise Questions</div>
        <h1 className="text-2xl font-bold text-slate-100">LeetCode Browser</h1>
        <p className="text-xs text-slate-500 mt-1">Each question includes company tags for every employer where it appears.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { k: "Total Entries", v: stats.totalEntries.toLocaleString() },
            { k: "Unique Questions", v: stats.uniqueQuestions.toLocaleString(), hl: true },
            { k: "Total Companies", v: stats.companies.toLocaleString() },
            { k: "Easy", v: stats.easy.toLocaleString() },
            { k: "Medium", v: stats.medium.toLocaleString() },
            { k: "Hard", v: stats.hard.toLocaleString() },
          ].map((s) => (
            <div key={s.k} className={`rounded-lg border ${s.hl ? "border-indigo-500/50 bg-indigo-500/10" : "border-slate-800 bg-slate-900/50"} p-3`}>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{s.k}</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(0)}
          placeholder="Search by ID, title…"
          className="bg-slate-800 text-slate-100 text-sm rounded px-3 py-2 border border-slate-700 flex-1 min-w-[200px]" />
        <input value={company} onChange={(e) => setCompany(e.target.value.toLowerCase())}
          onKeyDown={(e) => e.key === "Enter" && load(0)}
          placeholder="Company (e.g. amazon)"
          className="bg-slate-800 text-slate-100 text-sm rounded px-3 py-2 border border-slate-700 w-48" />
        <input value={topic} onChange={(e) => setTopic(e.target.value.toLowerCase())}
          onKeyDown={(e) => e.key === "Enter" && load(0)}
          placeholder="Topic (e.g. array)"
          className="bg-slate-800 text-slate-100 text-sm rounded px-3 py-2 border border-slate-700 w-48" />
        <select value={diff} onChange={(e) => setDiff(e.target.value as any)}
          className="bg-slate-800 text-slate-100 text-sm rounded px-3 py-2 border border-slate-700">
          <option value="">All difficulties</option>
          <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
        </select>
        <button onClick={() => load(0)}
          className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2">Search</button>
      </div>

      <div className="text-xs text-slate-500">
        {total > 0 && `Showing ${skip + 1}–${Math.min(skip + PAGE, total)} of ${total.toLocaleString()} questions`}
      </div>

      {err && <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">Error: {err}</div>}

      {loading ? (
        <div className="text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Loading…</div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-800">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Title</div>
            <div className="col-span-1">Difficulty</div>
            <div className="col-span-1">Accept.</div>
            <div className="col-span-1">Freq.</div>
            <div className="col-span-2">Topic</div>
            <div className="col-span-2">Companies</div>
          </div>
          {rows.length === 0 && !err && <div className="p-4 text-slate-400 text-sm">No questions found.</div>}
          {rows.map((q) => {
            const shownCompanies = q.companies.slice(0, 4);
            const companyExtra = q.companies.length - shownCompanies.length;
            const shownTopics = (q.topics ?? []).slice(0, 3);
            const topicExtra = (q.topics ?? []).length - shownTopics.length;
            return (
              <div key={q.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-3 border-b border-slate-800/60 hover:bg-slate-800/40">
                <div className="md:col-span-1 text-slate-500 text-sm">{q.id}</div>
                <div className="md:col-span-4">
                  <a href={q.url} target="_blank" rel="noreferrer" className="text-slate-100 text-sm font-medium hover:text-indigo-300 inline-flex items-center gap-1">
                    {q.title} <ExternalLink size={11} className="opacity-50" />
                  </a>
                </div>
                <div className={`md:col-span-1 text-xs font-semibold ${diffColor[q.difficulty] ?? ""}`}>{q.difficulty}</div>
                <div className="md:col-span-1 text-xs text-slate-400">{q.acceptance != null ? `${Number(q.acceptance).toFixed(1)}%` : ""}</div>
                <div className="md:col-span-1 text-xs text-slate-400">{q.frequency_max != null ? `${Number(q.frequency_max).toFixed(1)}%` : ""}</div>
                <div className="md:col-span-2 flex flex-wrap gap-1">
                  {shownTopics.map((t: string) => (
                    <button key={t} onClick={() => { setTopic(t); setCompany(""); load(0); }}
                      className="text-[10px] lowercase bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full px-2 py-0.5 border border-slate-700">
                      {t}
                    </button>
                  ))}
                  {topicExtra > 0 && (
                    <button onClick={() => setTopic((q.topics ?? [])[0] ?? "")}
                      className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-full px-2 py-0.5 border border-indigo-500/40">
                      +{topicExtra} more
                    </button>
                  )}
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-1">
                  {shownCompanies.map((c: string) => (
                    <button key={c} onClick={() => { setCompany(c); load(0); }}
                      className="text-[10px] capitalize bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full px-2 py-0.5 border border-slate-700">
                      {c}
                    </button>
                  ))}
                  {companyExtra > 0 && (
                    <button onClick={() => setModal({ title: q.title, companies: q.companies })}
                      className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-full px-2 py-0.5 border border-indigo-500/40">
                      +{companyExtra} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button disabled={skip === 0 || loading} onClick={() => load(Math.max(0, skip - PAGE))}
          className="rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm px-3 py-2 inline-flex items-center gap-1 disabled:opacity-40">
          <ChevronLeft size={14} /> Prev
        </button>
        <div className="text-xs text-slate-500">Page {Math.floor(skip / PAGE) + 1} of {Math.max(1, Math.ceil(total / PAGE))}</div>
        <button disabled={skip + PAGE >= total || loading} onClick={() => load(skip + PAGE)}
          className="rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm px-3 py-2 inline-flex items-center gap-1 disabled:opacity-40">
          Next <ChevronRight size={14} />
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="text-slate-100 font-semibold">Companies for: {modal.title}</div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-100"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
              {modal.companies.map((c) => (
                <button key={c} onClick={() => { setCompany(c); setModal(null); load(0); }}
                  className="capitalize text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg px-3 py-2 border border-slate-700">
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
