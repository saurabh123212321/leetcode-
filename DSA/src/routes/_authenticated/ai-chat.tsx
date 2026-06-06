import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import ReactMarkdown from "react-markdown";
import { Plus, Loader2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-chat")({ component: AiChatPage });

interface Convo { id: string; title: string; created_at: string; }
interface Msg { id: string; role: string; content: string; created_at: string; }

function AiChatPage() {
  const { profile } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const aiFn = useServerFn(aiChat);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from("ai_conversations").select("*").eq("created_by", profile.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => { setConvos((data as Convo[]) ?? []); if (data?.[0]) setActiveId(data[0].id); });
  }, [profile?.id]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    supabase.from("ai_messages").select("*").eq("conversation_id", activeId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send() {
    if (!input.trim() || busy) return;
    const msg = input; setInput(""); setBusy(true);
    setMessages((p) => [...p, { id: "tmp-" + Date.now(), role: "user", content: msg, created_at: new Date().toISOString() }]);
    try {
      const r = await aiFn({ data: { conversation_id: activeId ?? undefined, message: msg, mode: "chat" } });
      if (!activeId && r.conversation_id) {
        setActiveId(r.conversation_id);
        const { data } = await supabase.from("ai_conversations").select("*").eq("created_by", profile!.id).order("created_at", { ascending: false }).limit(30);
        setConvos((data as Convo[]) ?? []);
      }
      // reload messages
      const id = r.conversation_id ?? activeId;
      const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", id!).order("created_at", { ascending: true });
      setMessages((data as Msg[]) ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100">
      <div className="w-64 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <button onClick={() => { setActiveId(null); setMessages([]); }} className="m-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm flex items-center gap-2 justify-center">
          <Plus size={14} /> New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {convos.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded mb-1 ${activeId === c.id ? "bg-slate-800" : "hover:bg-slate-800/60"}`}>
              <div className="truncate">{c.title}</div>
              <div className="text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="border-b border-slate-800 px-5 py-3 flex items-center gap-2">
          <MessageSquare size={16} /> <div className="font-semibold">AI Assistant</div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !busy && (
            <div className="text-center text-slate-500 mt-20">
              <Sparkle /> <p className="mt-3">Ask me anything about programming, DSA, or your code.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-2xl rounded-lg px-4 py-3 ${m.role === "user" ? "bg-indigo-600" : "bg-slate-800"}`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={14} /> Thinking…</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything..." rows={2}
              className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-sm resize-none" />
            <button onClick={send} disabled={busy || !input.trim()} className="px-4 bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sparkle() { return <div className="text-4xl">✨</div>; }
