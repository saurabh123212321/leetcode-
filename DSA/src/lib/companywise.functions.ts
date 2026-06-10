import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const cwStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, count, error } = await supabaseAdmin
    .from("cw_questions")
    .select("difficulty,company_count,companies", { count: "exact" })
    .range(0, 20000);
  if (error) throw error;
  const set = new Set<string>();
  let easy = 0, medium = 0, hard = 0, totalEntries = 0;
  for (const r of rows ?? []) {
    if (r.difficulty === "Easy") easy++;
    else if (r.difficulty === "Medium") medium++;
    else if (r.difficulty === "Hard") hard++;
    totalEntries += (r as any).company_count ?? 0;
    for (const c of (r as any).companies ?? []) set.add(c);
  }
  return {
    totalEntries,
    uniqueQuestions: count ?? rows?.length ?? 0,
    companies: set.size,
    easy, medium, hard,
  };
});

export const cwList = createServerFn({ method: "GET" })
  .inputValidator((i) =>
    z.object({
      search: z.string().max(200).optional(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
      company: z.string().max(100).optional(),
      topic: z.string().max(100).optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("cw_questions")
      .select("id,title,slug,url,difficulty,acceptance,frequency_max,companies,company_count", { count: "exact" });
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.company) q = q.contains("companies", [data.company.toLowerCase()]);
    if (data.search) {
      const s = data.search.trim();
      if (/^\d+$/.test(s)) q = q.eq("id", Number(s));
      else q = q.ilike("title", `%${s}%`);
    }
    q = q
      .order("frequency_max", { ascending: false })
      .order("id", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const cwCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("cw_questions").select("companies").range(0, 20000);
  const set = new Set<string>();
  for (const r of data ?? []) for (const c of (r as any).companies ?? []) set.add(c);
  return [...set].sort();
});
