import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, highestRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Code2, BookOpen, Brain, MessageSquare, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile, roles, user } = useAuth();
  const role = highestRole(roles);
  const [stats, setStats] = useState({ files: 0, notes: 0, quizzes: 0, chats: 0, submissions: 0, students: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [announcements, setAnn] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    (async () => {
      const tid = profile.tenant_id!;
      const [f, n, q, c, s, ann, act] = await Promise.all([
        supabase.from("files").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("ai_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("coding_submissions").select("id", { count: "exact", head: true }).eq("tenant_id", tid),
        supabase.from("announcements").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_logs").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(8),
      ]);
      let students = 0;
      if (role !== "student") {
        const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("tenant_id", tid).eq("role", "student");
        students = count ?? 0;
      }
      setStats({ files: f.count ?? 0, notes: n.count ?? 0, quizzes: q.count ?? 0, chats: c.count ?? 0, submissions: s.count ?? 0, students });
      setAnn(ann.data ?? []);
      setRecent(act.data ?? []);
    })();
  }, [profile?.tenant_id, role]);

  const cards = [
    { label: "Files", value: stats.files, icon: Code2, to: "/workspace", color: "bg-indigo-600" },
    { label: "Notes", value: stats.notes, icon: BookOpen, to: "/notes", color: "bg-emerald-600" },
    { label: "Quizzes", value: stats.quizzes, icon: Brain, to: "/quizzes", color: "bg-purple-600" },
    { label: "AI chats", value: stats.chats, icon: MessageSquare, to: "/ai-chat", color: "bg-pink-600" },
    { label: "Code runs", value: stats.submissions, icon: TrendingUp, to: "/workspace", color: "bg-amber-600" },
  ];
  if (role !== "student") cards.push({ label: "Students", value: stats.students, icon: Activity, to: "/admin", color: "bg-cyan-600" });

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <h1 className="text-3xl font-bold mb-1">Welcome back, {profile?.full_name?.split(" ")[0] ?? user?.email}</h1>
      <p className="text-slate-400 mb-8">Role: <span className="capitalize text-indigo-400">{role.replace("_", " ")}</span></p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-indigo-500 transition">
            <div className={`${c.color} w-9 h-9 rounded flex items-center justify-center mb-3`}>
              <c.icon size={18} />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-slate-400">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="font-semibold mb-4">Announcements</h2>
          {announcements.length === 0 ? <div className="text-sm text-slate-500">No announcements yet.</div> : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-l-2 border-indigo-500 pl-3">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{a.body}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="font-semibold mb-4">Recent activity</h2>
          {recent.length === 0 ? <div className="text-sm text-slate-500">No activity yet.</div> : (
            <ul className="space-y-2 text-sm">
              {recent.map((a) => (
                <li key={a.id} className="flex justify-between text-slate-300">
                  <span>{a.action}</span>
                  <span className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Link to="/workspace" className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-lg hover:opacity-90">
          <Code2 className="mb-2" /> <div className="font-semibold">Open Workspace</div>
          <div className="text-xs opacity-80">Write & run code with AI</div>
        </Link>
        <Link to="/ai-chat" className="bg-gradient-to-br from-pink-600 to-rose-700 p-6 rounded-lg hover:opacity-90">
          <MessageSquare className="mb-2" /> <div className="font-semibold">Chat with AI</div>
          <div className="text-xs opacity-80">Explain, fix, generate</div>
        </Link>
        <Link to="/quizzes" className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-lg hover:opacity-90">
          <Brain className="mb-2" /> <div className="font-semibold">Take a Quiz</div>
          <div className="text-xs opacity-80">Test your knowledge</div>
        </Link>
      </div>
    </div>
  );
}
