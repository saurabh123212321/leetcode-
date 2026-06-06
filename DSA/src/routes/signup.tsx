import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    const { error } = await signUp(email, password, name);
    setBusy(false);
    if (error) setErr(error);
    else { setMsg("Account created. Check your email if confirmation is required, then sign in."); setTimeout(() => navigate({ to: "/login" }), 1500); }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-1">Create account</h2>
        <p className="text-slate-400 mb-6 text-sm">Join CodeLearn AI.</p>
        <form onSubmit={submit} className="space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Full name" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (6+ chars)" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded" />
          {err && <div className="text-red-400 text-sm">{err}</div>}
          {msg && <div className="text-emerald-400 text-sm">{msg}</div>}
          <button disabled={busy} className="w-full py-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50">
            {busy ? "Creating..." : "Sign up"}
          </button>
        </form>
        <div className="mt-4 text-sm text-slate-400">
          Have an account? <Link to="/login" className="text-indigo-400">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
