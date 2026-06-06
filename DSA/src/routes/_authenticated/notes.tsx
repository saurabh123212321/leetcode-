import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { summarizeNote } from "@/lib/ai.functions";
import { Plus, Pin, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({ component: NotesPage });

interface Note { id: string; title: string; content: string; topic: string | null; tags: string[]; is_pinned: boolean; summary: string | null; updated_at: string; }

function NotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const sumFn = useServerFn(summarizeNote);

  async function load() {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from("notes").select("*").eq("tenant_id", profile.tenant_id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
  }
  useEffect(() => { load(); }, [profile?.tenant_id]);

  async function create() {
    if (!profile) return;
    const { data } = await supabase.from("notes").insert({
      tenant_id: profile.tenant_id ?? "", created_by: profile.id, title: "Untitled", content: "# New note\n\nStart writing…",
    }).select("*").single();
    if (data) { setNotes((p) => [data as Note, ...p]); setActive(data as Note); }
  }
  async function save() {
    if (!active) return;
    await supabase.from("notes").update({ title: active.title, content: active.content, topic: active.topic, tags: active.tags, is_pinned: active.is_pinned }).eq("id", active.id);
    toast.success("Saved");
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("notes").delete().eq("id", id);
    setActive(null); load();
  }
  async function summarize() {
    if (!active) return;
    setBusy(true);
    try {
      const r = await sumFn({ data: { content: active.content } });
      setActive({ ...active, summary: r.summary });
      await supabase.from("notes").update({ summary: r.summary, is_ai_generated: true }).eq("id", active.id);
      toast.success("Summarized");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const filtered = notes.filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100">
      <div className="w-72 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button onClick={create} className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm flex items-center gap-1 justify-center">
            <Plus size={14} /> New note
          </button>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full bg-slate-800 px-2 py-1.5 text-sm rounded" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((n) => (
            <button key={n.id} onClick={() => setActive(n)}
              className={`w-full text-left px-3 py-2 border-b border-slate-800/50 ${active?.id === n.id ? "bg-slate-800" : "hover:bg-slate-800/50"}`}>
              <div className="flex items-center gap-1 text-sm font-medium truncate">
                {n.is_pinned && <Pin size={10} className="text-amber-400" />} {n.title}
              </div>
              {n.topic && <div className="text-xs text-indigo-400">{n.topic}</div>}
              <div className="text-xs text-slate-500 truncate">{n.content.slice(0, 60)}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-4 text-xs text-slate-500">No notes.</div>}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="border-b border-slate-800 p-3 flex gap-2 items-center">
              <input value={active.title} onChange={(e) => setActive({ ...active, title: e.target.value })}
                className="flex-1 bg-transparent text-lg font-semibold outline-none" />
              <button onClick={() => setActive({ ...active, is_pinned: !active.is_pinned })} className={`p-2 rounded ${active.is_pinned ? "text-amber-400" : "text-slate-400"}`}>
                <Pin size={16} />
              </button>
              <button onClick={summarize} disabled={busy} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded text-sm flex items-center gap-1 disabled:opacity-50">
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} AI Summary
              </button>
              <button onClick={save} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm">Save</button>
              <button onClick={() => del(active.id)} className="p-2 text-red-400 hover:bg-slate-800 rounded"><Trash2 size={14} /></button>
            </div>
            {active.summary && (
              <div className="border-b border-slate-800 bg-pink-950/20 p-3">
                <div className="text-xs text-pink-300 mb-1">AI Summary</div>
                <div className="text-sm prose prose-invert max-w-none"><ReactMarkdown>{active.summary}</ReactMarkdown></div>
              </div>
            )}
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              <textarea value={active.content} onChange={(e) => setActive({ ...active, content: e.target.value })}
                className="bg-slate-950 border-r border-slate-800 p-4 font-mono text-sm outline-none resize-none" />
              <div className="overflow-y-auto p-4 prose prose-invert max-w-none">
                <ReactMarkdown>{active.content}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">Select or create a note</div>
        )}
      </div>
    </div>
  );
}
