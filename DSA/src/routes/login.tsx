import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

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
    else {
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center px-12 bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900">
        <h1 className="text-4xl font-bold mb-3">CodeLearn AI</h1>
        <p className="text-slate-300 max-w-md">AI-powered DSA practice, coding interviews, and real-time feedback for skill development.</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-slate-400 mb-6 text-sm">Welcome back to CodeLearn AI.</p>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
            {err && <div className="text-red-400 text-sm">{err}</div>}
            <button disabled={busy} className="w-full py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 font-semibold">
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-4 text-sm text-slate-400">
            No account? <Link to="/signup" className="text-indigo-400">Sign up</Link>
          </div>
          
          <div className="mt-6 text-xs text-slate-500 pt-4 border-t border-slate-800">
            <Link to="/" className="hover:text-slate-300 inline-flex items-center gap-1">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


