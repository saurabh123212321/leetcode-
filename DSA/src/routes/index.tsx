import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl">CodeLearn AI</div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500">Sign in</Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <div className="space-y-6">
          <h1 className="text-6xl font-bold leading-tight">AI-powered DSA Learning & Coding Practice Platform</h1>
          <p className="text-xl text-slate-400 max-w-3xl">
            Master data structures and algorithms with an intelligent, multi-tenant platform that combines IDE-based practice, AI-generated test cases, real-time feedback, and comprehensive learning tools.
          </p>
          <Link to="/login" className="inline-block px-8 py-3 bg-indigo-600 rounded hover:bg-indigo-500 font-semibold">
            Get Started
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="text-2xl font-bold text-indigo-400 mb-3">🚀</div>
            <h3 className="text-lg font-semibold mb-2">IDE-Based Practice</h3>
            <p className="text-slate-400 text-sm">Write code in a Monaco editor with real-time syntax highlighting, language support (Python, C++, Java, JavaScript), and instant test execution.</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="text-2xl font-bold text-emerald-400 mb-3">✨</div>
            <h3 className="text-lg font-semibold mb-2">AI-Generated Test Cases</h3>
            <p className="text-slate-400 text-sm">Automatically generate comprehensive test suites with edge cases, boundary conditions, and multiple input scenarios powered by AI.</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="text-2xl font-bold text-cyan-400 mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">AI Review & Feedback</h3>
            <p className="text-slate-400 text-sm">Get detailed code analysis, complexity assessment, optimization suggestions, and personalized feedback from AI after each submission.</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Core Features</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">📝 Revision Tests (Color-tagged)</h4>
              <p className="text-slate-400 text-sm">Organize practice problems by difficulty level (Red/Yellow/Green/Blue/Purple) and revise strategically. Timed sessions with AI-powered problem statements and test case generation.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">🎯 Timed Interview Practice</h4>
              <p className="text-slate-400 text-sm">Generate random coding questions by topic and difficulty. Solve in the IDE with configurable time limits. Get scored and reviewed by AI after submission.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">📚 Problem Library</h4>
              <p className="text-slate-400 text-sm">Access a curated collection of DSA problems with difficulty rankings, topic tags, company categorization, and detailed problem statements with constraints.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">💬 AI Chat Assistant</h4>
              <p className="text-slate-400 text-sm">Ask questions about problems, get hints, discuss approaches, and learn concepts. AI maintains context and provides explanations tailored to your learning level.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">📖 Smart Notes</h4>
              <p className="text-slate-400 text-sm">Create, organize, and search notes linked to problems and topics. Integrated note editor with markdown support and code snippet highlighting.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">🧩 Quizzes & Assessments</h4>
              <p className="text-slate-400 text-sm">Take concept quizzes, DSA challenges, and mock interviews. Track progress with detailed analytics and identify weak areas for focused revision.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">📊 Analytics Dashboard</h4>
              <p className="text-slate-400 text-sm">Monitor learning progress with submission history, pass rates, time spent, topics attempted, and performance trends over time.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h4 className="font-semibold text-slate-100 mb-2">🏢 Multi-Tenant Support</h4>
              <p className="text-slate-400 text-sm">Built for educational institutions and coding bootcamps. Manage multiple organizations, teams, and user roles with granular permissions.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Sign In & Select Topic</h4>
                <p className="text-slate-400 text-sm">Create an account and choose a DSA topic or difficulty level for revision or practice.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Get AI-Generated Problems & Tests</h4>
                <p className="text-slate-400 text-sm">AI automatically generates problem statements with examples and comprehensive test cases (public + hidden).</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Code in the IDE</h4>
                <p className="text-slate-400 text-sm">Write your solution in the web-based Monaco editor with syntax highlighting and language support.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold">4</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Run Tests & Debug</h4>
                <p className="text-slate-400 text-sm">Execute your code against public test cases, see results, and debug issues before final submission.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center font-bold">5</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Submit & Get Feedback</h4>
                <p className="text-slate-400 text-sm">Submit your solution to run against all test cases (including hidden). Receive AI analysis of time/space complexity and suggestions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-8">
          <h2 className="text-2xl font-bold mb-4">Why CodeLearn AI?</h2>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>Comprehensive Learning:</strong> Everything in one platform — problems, tests, feedback, notes, quizzes, and analytics.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>AI-Powered:</strong> Smart test generation, problem creation, code review, and personalized feedback at scale.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>Real IDE Experience:</strong> Practice with a professional Monaco editor instead of plain textareas.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>Multi-Language Support:</strong> Code in Python, C++, Java, or JavaScript with language-specific optimizations.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>Scalable & Secure:</strong> Built for teams and institutions with role-based access, data isolation, and enterprise readiness.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400">✓</span> <span><strong>Fast Feedback Loop:</strong> Get instant results and AI insights to accelerate learning and improvement.</span></li>
          </ul>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Ready to Master DSA?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Join thousands of students and developers learning data structures and algorithms with AI-powered guidance.</p>
          <Link to="/login" className="inline-block px-8 py-3 bg-indigo-600 rounded hover:bg-indigo-500 font-semibold">
            Sign In Now
          </Link>
        </div>
      </main>
    </div>
  );
}
