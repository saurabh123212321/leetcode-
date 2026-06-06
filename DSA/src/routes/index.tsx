import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<string>("");

  async function seed() {
    setSeeding(true);
    setResult("");
    try {
      const res = await fetch("/api/public/bootstrap", { method: "POST" });
      const json = await res.json();
      setResult(JSON.stringify(json));
    } catch (e: any) {
      setResult("Error: " + e.message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl">CodeLearn AI</div>
        <div className="flex items-center gap-3">
          <Link to="/problems" className="text-slate-300 hover:text-white text-sm">Problems</Link>
          <Link to="/login" className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500">Sign in</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-6">Multi-tenant AI coding & learning platform</h1>
        <p className="text-lg text-slate-400 mb-10">
          VS Code workspace + AI assistant + DSA learning + quizzes + notes. Built for teams.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-xl mb-3">First-time setup</h2>
          <p className="text-slate-400 mb-4">
            Seed 4 organizations, 117 demo users, notes, quizzes, files, AI chats, and analytics.
            Idempotent — safe to click multiple times.
          </p>
          <button
            onClick={seed}
            disabled={seeding}
            className="px-6 py-3 bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50"
          >
            {seeding ? "Seeding (takes 30-90 seconds)..." : "Seed demo data"}
          </button>
          {result && <pre className="mt-4 text-sm bg-slate-950 p-3 rounded overflow-x-auto">{result}</pre>}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="font-semibold text-xl mb-3">Demo accounts (after seeding)</h2>
          <ul className="space-y-2 text-sm font-mono text-slate-300">
            <li><span className="text-indigo-400">Super admin:</span><span> admin@gmail.com / Admin@123456</span></li>
            <li><span className="text-indigo-400">Admin:</span><span> admin1@techacademy.com / Admin@123</span></li>
            <li><span className="text-indigo-400">Mentor:</span><span> mentor1@techacademy.com / Mentor@123</span></li>
            <li><span className="text-indigo-400">Student:</span><span> student1@techacademy.com / Student@123</span></li>
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Also: ailearninghub.com, codemaster.com, smartdsa.com (same pattern, students 1-25)
          </p>
        </div>
      </main>
    </div>
  );
}
