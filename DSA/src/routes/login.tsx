import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

const QUICK = [
  { label: "Super Admin", email: "admin@gmail.com", password: "Admin@123456" },
  { label: "Tenant Admin", email: "admin1@techacademy.com", password: "Admin@123" },
  { label: "Mentor", email: "mentor1@techacademy.com", password: "Mentor@123" },
  { label: "Student", email: "student1@techacademy.com", password: "Student@123" },
];

function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setErr(error);
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center px-12 bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900">
        <h1 className="text-4xl font-bold mb-3">CodeLearn AI</h1>
        <p className="text-slate-300 max-w-md">VS Code workspace, AI pair-programming, DSA quizzes, notes — multi-tenant SaaS for coding teams.</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-slate-400 mb-6 text-sm">Welcome back.</p>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
            {err && <div className="text-red-400 text-sm">{err}</div>}
            <button disabled={busy} className="w-full py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50">
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-4 text-sm text-slate-400">
            No account? <Link to="/signup" className="text-indigo-400">Sign up</Link>
          </div>
          <div className="mt-6 border-t border-slate-800 pt-4">
            <div className="text-xs text-slate-500 mb-2">Quick demo login:</div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map((q) => (
                <button key={q.email} type="button" onClick={() => { setEmail(q.email); setPassword(q.password); }}
                  className="text-xs px-2 py-2 bg-slate-900 border border-slate-800 rounded hover:border-indigo-500 text-left">
                  <div className="font-semibold text-slate-200">{q.label}</div>
                  <div className="text-slate-500 truncate">{q.email}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
