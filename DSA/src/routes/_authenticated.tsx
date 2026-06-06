import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, highestRole } from "@/hooks/use-auth";
import { LayoutDashboard, Code2, MessageSquare, BookOpen, Brain, LogOut, Users, Building2, Menu, X, Trophy, Timer, Globe, BarChart3, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: AuthLayout });

function AuthLayout() {
  const { session, loading, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading…</div>;
  }

  const role = highestRole(roles);
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workspace", label: "Workspace", icon: Code2 },
    { to: "/problems", label: "Problems", icon: Trophy },
    { to: "/ai-chat", label: "AI Chat", icon: MessageSquare },
    { to: "/notes", label: "Notes", icon: BookOpen },
    { to: "/quizzes", label: "Quizzes", icon: Brain },
    { to: "/practice", label: "Practice", icon: Timer },
    { to: "/revision", label: "Revision Test", icon: RotateCcw },
    { to: "/leetcode", label: "LeetCode", icon: Globe },
    { to: "/visualize", label: "Visualizer", icon: BarChart3 },
  ];
  if (role === "admin" || role === "super_admin") nav.push({ to: "/admin", label: "Admin", icon: Users });
  if (role === "super_admin") nav.push({ to: "/super-admin", label: "Tenants", icon: Building2 });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="fixed left-2 top-2 z-50 rounded bg-slate-900/95 p-2 text-slate-200 shadow-lg ring-1 ring-slate-700 md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      {mobileNavOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-40 bg-slate-950/70 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-slate-800 flex flex-col bg-slate-950 transition-transform md:static md:translate-x-0 md:bg-slate-900/40 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-lg">CodeLearn AI</div>
              <div className="text-xs text-slate-500 capitalize">{role.replace("_", " ")}</div>
            </div>
            <button onClick={() => setMobileNavOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden" aria-label="Close navigation">
              <X size={16} />
            </button>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                <Icon size={16} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="text-xs text-slate-400 mb-2 truncate">{profile?.full_name ?? profile?.email}</div>
          <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
