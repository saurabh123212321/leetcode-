// Idempotent demo seeder. Creates auth users, tenants, roles, and demo content.
// Triggered once from the landing page; safe to call multiple times.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

async function getAdminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Demo seeding creates login accounts and needs the private backend key when running locally. Sign in with existing users to test the app without it.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const TENANTS = [
  { name: "Tech Academy", slug: "techacademy", domain: "techacademy.com" },
  { name: "AI Learning Hub", slug: "ailearninghub", domain: "ailearninghub.com" },
  { name: "Code Master Institute", slug: "codemaster", domain: "codemaster.com" },
  { name: "Smart DSA Academy", slug: "smartdsa", domain: "smartdsa.com" },
];

const TOPICS = ["Arrays", "Strings", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Recursion", "Greedy"];
const FOLDERS = ["DSA Practice", "Interview Prep", "Python Projects", "JavaScript Basics", "Algorithms", "Notes"];

function noteContent(topic: string) {
  return `# ${topic}

## Overview
${topic} is a fundamental topic in computer science and DSA.

## Key Concepts
- Core idea and intuition
- Time and space complexity analysis
- Common patterns and templates

## Example
\`\`\`javascript
// Solving a typical ${topic} problem
function solve(input) {
  // ... algorithm here
  return input;
}
\`\`\`

## When to use
Use this approach when the problem involves ${topic.toLowerCase()}-like access patterns.

> AI Summary: Mastering ${topic} requires practice on 15-20 problems and understanding the underlying invariants.
`;
}

function quizQuestions(topic: string, difficulty: string) {
  return [
    {
      type: "mcq",
      question: `Which data structure best represents ${topic}?`,
      options: ["Array", "Hash Map", "Tree", "Graph"],
      correct: 0,
    },
    {
      type: "mcq",
      question: `What is the typical time complexity for traversal in ${topic}?`,
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correct: 2,
    },
    {
      type: "mcq",
      question: `${difficulty} ${topic}: identify the optimal approach`,
      options: ["Brute force", "Greedy", "Dynamic programming", "Divide and conquer"],
      correct: 2,
    },
  ];
}

const SAMPLE_FILES = [
  { name: "two_sum.py", language: "python", content: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n" },
  { name: "fibonacci.js", language: "javascript", content: "function fib(n) {\n  if (n < 2) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];\n  return b;\n}\nconsole.log(fib(10));\n" },
  { name: "BinarySearch.java", language: "java", content: "public class BinarySearch {\n  public static int bs(int[] a, int t) {\n    int l = 0, r = a.length - 1;\n    while (l <= r) {\n      int m = (l + r) / 2;\n      if (a[m] == t) return m;\n      if (a[m] < t) l = m + 1; else r = m - 1;\n    }\n    return -1;\n  }\n}\n" },
  { name: "quicksort.cpp", language: "cpp", content: "#include <vector>\nusing namespace std;\nvoid qsort(vector<int>& a, int l, int r) {\n  if (l >= r) return;\n  int p = a[(l+r)/2], i = l, j = r;\n  while (i <= j) {\n    while (a[i] < p) i++;\n    while (a[j] > p) j--;\n    if (i <= j) swap(a[i++], a[j--]);\n  }\n  qsort(a, l, j); qsort(a, i, r);\n}\n" },
  { name: "queries.sql", language: "sql", content: "SELECT user_id, COUNT(*) as solved\nFROM submissions\nWHERE status = 'accepted'\nGROUP BY user_id\nORDER BY solved DESC\nLIMIT 10;\n" },
  { name: "page.html", language: "html", content: "<!DOCTYPE html>\n<html>\n<head><title>Hello</title></head>\n<body><h1>Hello world</h1></body>\n</html>\n" },
];

async function ensureUser(email: string, password: string, fullName: string) {
  const supabaseAdmin = await getAdminClient();
  // Try to find existing
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find(u => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user!.id;
}

export const bootstrapDemo = createServerFn({ method: "POST" }).handler(async () => {
  const supabaseAdmin = await getAdminClient();
  // Idempotency check
  const { data: existingSuper } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "super_admin")
    .limit(1);
  if (existingSuper && existingSuper.length > 0) {
    return { ok: true, status: "already_seeded" };
  }

  // 1. Super admin
  const superId = await ensureUser("admin@gmail.com", "Admin@123456", "Super Admin");
  await supabaseAdmin.from("profiles").upsert({
    id: superId,
    email: "admin@gmail.com",
    full_name: "Super Admin",
    must_reset_password: true,
    is_seeded: true,
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: superId, role: "super_admin", tenant_id: null });

  // 2. Tenants
  const tenantRows: { id: string; slug: string; domain: string; name: string }[] = [];
  for (const t of TENANTS) {
    const { data } = await supabaseAdmin.from("tenants").insert({ name: t.name, slug: t.slug, plan: "organization" }).select().single();
    if (data) tenantRows.push({ id: data.id, slug: t.slug, domain: t.domain, name: t.name });
  }

  // 3. Per tenant: admins, mentors, students + data
  for (const tenant of tenantRows) {
    // Subscription
    await supabaseAdmin.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan: "organization",
      status: "active",
      ai_tokens_used: Math.floor(Math.random() * 50000),
      storage_used_mb: Math.floor(Math.random() * 500),
      monthly_revenue: 999,
    });

    // 1 Admin
    const adminEmail = `admin1@${tenant.domain}`;
    const adminId = await ensureUser(adminEmail, "Admin@123", `Admin ${tenant.name}`);
    await supabaseAdmin.from("profiles").upsert({ id: adminId, email: adminEmail, full_name: `Admin ${tenant.name}`, tenant_id: tenant.id, is_seeded: true });
    await supabaseAdmin.from("user_roles").insert({ user_id: adminId, role: "admin", tenant_id: tenant.id });

    // 3 Mentors
    const mentorIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const email = `mentor${i}@${tenant.domain}`;
      const id = await ensureUser(email, "Mentor@123", `Mentor ${i} ${tenant.name}`);
      await supabaseAdmin.from("profiles").upsert({ id, email, full_name: `Mentor ${i}`, tenant_id: tenant.id, is_seeded: true });
      await supabaseAdmin.from("user_roles").insert({ user_id: id, role: "mentor", tenant_id: tenant.id });
      mentorIds.push(id);
    }

    // 25 Students
    const studentIds: string[] = [];
    for (let i = 1; i <= 25; i++) {
      const email = `student${i}@${tenant.domain}`;
      const id = await ensureUser(email, "Student@123", `Student ${i}`);
      await supabaseAdmin.from("profiles").upsert({ id, email, full_name: `Student ${i}`, tenant_id: tenant.id, is_seeded: true });
      await supabaseAdmin.from("user_roles").insert({ user_id: id, role: "student", tenant_id: tenant.id });
      studentIds.push(id);
    }

    // Workspace per tenant (owned by admin)
    const { data: ws } = await supabaseAdmin.from("workspaces").insert({
      tenant_id: tenant.id,
      created_by: adminId,
      name: `${tenant.name} Workspace`,
      description: "Shared starter workspace",
    }).select().single();

    // Folders + seed files
    if (ws) {
      for (const fname of FOLDERS) {
        const { data: folder } = await supabaseAdmin.from("folders").insert({
          tenant_id: tenant.id, workspace_id: ws.id, created_by: adminId, name: fname,
        }).select().single();
        if (folder && (fname === "DSA Practice" || fname === "Algorithms")) {
          for (const f of SAMPLE_FILES) {
            await supabaseAdmin.from("files").insert({
              tenant_id: tenant.id, workspace_id: ws.id, folder_id: folder.id,
              created_by: studentIds[Math.floor(Math.random() * studentIds.length)],
              name: f.name, language: f.language, content: f.content,
            });
          }
        }
      }
    }

    // Notes (per mentor)
    for (const topic of TOPICS) {
      const author = mentorIds[Math.floor(Math.random() * mentorIds.length)];
      await supabaseAdmin.from("notes").insert({
        tenant_id: tenant.id, created_by: author,
        title: `${topic} — Complete Guide`,
        content: noteContent(topic),
        topic, tags: [topic.toLowerCase(), "dsa", "guide"],
        is_pinned: Math.random() > 0.7,
        is_ai_generated: Math.random() > 0.6,
        summary: `Master ${topic} in 7 days with examples and templates.`,
      });
    }

    // Quizzes
    const quizIds: string[] = [];
    for (const topic of TOPICS.slice(0, 6)) {
      for (const diff of ["beginner", "intermediate", "advanced"] as const) {
        const { data: q } = await supabaseAdmin.from("quizzes").insert({
          tenant_id: tenant.id,
          created_by: mentorIds[0],
          title: `${topic} — ${diff}`,
          description: `Test your ${topic} skills at ${diff} level`,
          topic, difficulty: diff,
          time_limit_minutes: 20,
          questions: quizQuestions(topic, diff),
        }).select().single();
        if (q) quizIds.push(q.id);
      }
    }

    // Quiz attempts (random subset of students × subset of quizzes)
    for (const sid of studentIds.slice(0, 20)) {
      for (const qid of quizIds.slice(0, 5 + Math.floor(Math.random() * 8))) {
        const total = 3;
        const score = Math.floor(Math.random() * (total + 1));
        await supabaseAdmin.from("quiz_attempts").insert({
          tenant_id: tenant.id, quiz_id: qid, created_by: sid,
          score, total,
          time_taken_seconds: 200 + Math.floor(Math.random() * 800),
          answers: { picked: [0, 2, 1] },
        });
      }
    }

    // Coding submissions
    for (const sid of studentIds.slice(0, 15)) {
      for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
        const f = SAMPLE_FILES[Math.floor(Math.random() * SAMPLE_FILES.length)];
        await supabaseAdmin.from("coding_submissions").insert({
          tenant_id: tenant.id, created_by: sid,
          language: f.language, code: f.content,
          stdout: "ok\n", status: "Accepted",
          execution_time: Math.random() * 2, memory_kb: 8000 + Math.floor(Math.random() * 4000),
        });
      }
    }

    // AI conversations + messages
    for (const sid of studentIds.slice(0, 10)) {
      const { data: conv } = await supabaseAdmin.from("ai_conversations").insert({
        tenant_id: tenant.id, created_by: sid, title: "Debugging help",
      }).select().single();
      if (conv) {
        await supabaseAdmin.from("ai_messages").insert([
          { tenant_id: tenant.id, conversation_id: conv.id, created_by: sid, role: "user", content: "My binary search is going into an infinite loop. What's wrong?" },
          { tenant_id: tenant.id, conversation_id: conv.id, created_by: sid, role: "assistant", content: "Common cause: updating `l` or `r` incorrectly when `nums[mid] == target`. Make sure the loop bounds change every iteration. Try using `l = mid + 1` and `r = mid - 1`." },
        ]);
      }
    }

    // Activity logs (last 30 days)
    const now = Date.now();
    const actions = ["login", "solved_problem", "created_note", "ai_query", "quiz_attempt", "code_run"];
    for (const sid of studentIds) {
      for (let i = 0; i < 12; i++) {
        const ts = new Date(now - Math.floor(Math.random() * 30) * 86400000).toISOString();
        await supabaseAdmin.from("activity_logs").insert({
          tenant_id: tenant.id, created_by: sid,
          action: actions[Math.floor(Math.random() * actions.length)],
          metadata: { ts },
        });
      }
    }

    // Notifications
    for (const sid of studentIds.slice(0, 15)) {
      await supabaseAdmin.from("notifications").insert([
        { tenant_id: tenant.id, recipient_id: sid, title: "Revision reminder", body: "Review Arrays today", type: "reminder" },
        { tenant_id: tenant.id, recipient_id: sid, title: "New quiz", body: "DP quiz is live", type: "info" },
        { tenant_id: tenant.id, recipient_id: sid, title: "Streak alert", body: "You're on a 7-day streak!", type: "achievement" },
      ]);
    }

    // Announcement
    await supabaseAdmin.from("announcements").insert({
      tenant_id: tenant.id, created_by: mentorIds[0],
      title: "Welcome!", body: `Welcome to ${tenant.name}. Start with the DSA Practice folder.`,
    });
  }

  return { ok: true, status: "seeded" };
});
