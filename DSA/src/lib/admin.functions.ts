import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const roleSchema = z.enum(["admin", "mentor", "student", "super_admin"]);

type DbClient = any;

async function getAdminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("This action creates login accounts and needs the private backend key when running locally. Normal app data works without it.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function currentAccess(db: DbClient, userId: string) {
  const { data: roles } = await db.from("user_roles").select("role,tenant_id").eq("user_id", userId);
  const superAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
  const adminTenant = (roles ?? []).find((r: any) => r.role === "admin")?.tenant_id ?? null;
  return { superAdmin, adminTenant };
}

async function ensureAuthUser(email: string, password: string, fullName: string) {
  const admin = await getAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user!.id;
}

export const getSuperAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { superAdmin } = await currentAccess(db, context.userId);
    if (!superAdmin) throw new Error("Super admin access required");

    const { data: tenants } = await db.from("tenants").select("*").order("created_at", { ascending: true });
    const rows = await Promise.all((tenants ?? []).map(async (tenant: any) => {
      const [users, files, notes, quizzes, chats, submissions, activities, tickets, sub, roles] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("files").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("notes").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("quizzes").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("ai_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("coding_submissions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("activity_logs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("support_tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        db.from("subscriptions").select("*").eq("tenant_id", tenant.id).maybeSingle(),
        db.from("user_roles").select("role").eq("tenant_id", tenant.id),
      ]);
      const roleCounts = (roles.data ?? []).reduce((acc: Record<string, number>, r: any) => {
        acc[r.role] = (acc[r.role] ?? 0) + 1;
        return acc;
      }, {});
      return {
        tenant,
        stats: {
          users: users.count ?? 0,
          files: files.count ?? 0,
          notes: notes.count ?? 0,
          quizzes: quizzes.count ?? 0,
          chats: chats.count ?? 0,
          submissions: submissions.count ?? 0,
          activities: activities.count ?? 0,
          tickets: tickets.count ?? 0,
          roleCounts,
          subscription: sub.data,
        },
      };
    }));
    return { tenants: rows };
  });

export const createTenantAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    tenant_name: z.string().min(2).max(80),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    admin_email: z.string().email(),
    admin_password: z.string().min(8).max(72),
    admin_name: z.string().min(2).max(80),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { superAdmin } = await currentAccess(db, context.userId);
    if (!superAdmin) throw new Error("Super admin access required");
    const admin = await getAdminClient();

    const { data: existingTenant } = await admin.from("tenants").select("*").eq("slug", data.slug).maybeSingle();
    const tenant = existingTenant ?? (await admin.from("tenants").insert({
      name: data.tenant_name,
      slug: data.slug,
      plan: "organization",
      status: "active",
    }).select("*").single()).data;
    if (!tenant) throw new Error("Tenant could not be created");
    if (existingTenant) await admin.from("tenants").update({ name: data.tenant_name, plan: "organization", status: "active" }).eq("id", existingTenant.id);

    const { data: existingSub } = await admin.from("subscriptions").select("id").eq("tenant_id", tenant.id).maybeSingle();
    if (existingSub?.id) {
      await admin.from("subscriptions").update({ plan: "organization", status: "active", monthly_revenue: 999 }).eq("id", existingSub.id);
    } else {
      await admin.from("subscriptions").insert({ tenant_id: tenant.id, plan: "organization", status: "active", monthly_revenue: 999, ai_tokens_used: 0, storage_used_mb: 0 });
    }

    const adminId = await ensureAuthUser(data.admin_email, data.admin_password, data.admin_name);
    await admin.from("profiles").upsert({ id: adminId, email: data.admin_email, full_name: data.admin_name, tenant_id: tenant.id, is_seeded: false });
    await admin.from("user_roles").delete().eq("user_id", adminId).eq("tenant_id", tenant.id);
    await admin.from("user_roles").insert({ user_id: adminId, tenant_id: tenant.id, role: "admin" });
    await admin.from("workspaces").insert({ tenant_id: tenant.id, created_by: adminId, name: `${data.tenant_name} Workspace`, description: "Default workspace" });
    await admin.from("activity_logs").insert({ tenant_id: tenant.id, created_by: context.userId, action: "tenant_created", metadata: { tenant_name: data.tenant_name, admin_email: data.admin_email } });
    return { ok: true, tenant_id: tenant.id, admin_id: adminId };
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    tenant_id: z.string().uuid().optional().nullable(),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    full_name: z.string().min(2).max(80),
    role: roleSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const access = await currentAccess(db, context.userId);
    const tenantId = access.superAdmin ? data.tenant_id : access.adminTenant;
    if (data.role === "super_admin" && !access.superAdmin) throw new Error("Only super admins can create super admins");
    if (!tenantId && data.role !== "super_admin") throw new Error("Tenant is required");
    if (!access.superAdmin && !["student", "mentor", "admin"].includes(data.role)) throw new Error("Not allowed");

    const userId = await ensureAuthUser(data.email, data.password, data.full_name);
    const admin = await getAdminClient();
    await admin.from("profiles").upsert({ id: userId, email: data.email, full_name: data.full_name, tenant_id: tenantId ?? null, is_seeded: false });
    if (data.role === "super_admin") {
      await admin.from("user_roles").insert({ user_id: userId, tenant_id: null, role: "super_admin" });
    } else {
      await admin.from("user_roles").delete().eq("user_id", userId).eq("tenant_id", tenantId!);
      await admin.from("user_roles").insert({ user_id: userId, tenant_id: tenantId!, role: data.role });
      await admin.from("activity_logs").insert({ tenant_id: tenantId!, created_by: context.userId, action: "user_created", metadata: { email: data.email, role: data.role } });
    }
    return { ok: true, user_id: userId };
  });