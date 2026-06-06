import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EXT_TO_LANG: Record<string, string> = { js: "javascript", ts: "typescript", py: "python", java: "java", cpp: "cpp", c: "c", go: "go", rs: "rust", rb: "ruby", html: "html", css: "css", sql: "sql" };

type DbClient = any;

async function access(db: DbClient, userId: string, tenantId?: string | null) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    db.from("profiles").select("tenant_id").eq("id", userId).maybeSingle(),
    db.from("user_roles").select("role,tenant_id").eq("user_id", userId),
  ]);
  const superAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
  const ownTenant = (profile as any)?.tenant_id ?? null;
  if (superAdmin) return { tenantId: tenantId ?? ownTenant, superAdmin };
  if (!ownTenant || (tenantId && tenantId !== ownTenant)) throw new Error("Workspace access denied");
  return { tenantId: ownTenant, superAdmin };
}

async function workspaceTenant(db: DbClient, workspaceId: string) {
  const { data } = await db.from("workspaces").select("tenant_id").eq("id", workspaceId).single();
  if (!data?.tenant_id) throw new Error("Workspace not found");
  return data.tenant_id as string;
}

async function ensureFolderInWorkspace(db: DbClient, folderId: string | null | undefined, workspaceId: string) {
  if (!folderId) return;
  const { data, error } = await db.from("folders").select("id,workspace_id").eq("id", folderId).single();
  if (error || !data || data.workspace_id !== workspaceId) throw new Error("Target folder is not in this workspace");
}

function wouldCreateFolderCycle(folders: { id: string; parent_id: string | null }[], folderId: string, nextParentId: string | null | undefined) {
  let cursor = nextParentId ?? null;
  while (cursor) {
    if (cursor === folderId) return true;
    cursor = folders.find((folder) => folder.id === cursor)?.parent_id ?? null;
  }
  return false;
}

export const listWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const a = await access(db, context.userId);
    const query = db.from("workspaces").select("id,name,tenant_id").order("created_at", { ascending: true });
    const { data } = a.superAdmin ? await query : await query.eq("tenant_id", a.tenantId!);
    return { workspaces: data ?? [] };
  });

export const getWorkspaceTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspace_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const tenantId = await workspaceTenant(db, data.workspace_id);
    await access(db, context.userId, tenantId);
    const [files, folders] = await Promise.all([
      db.from("files").select("*").eq("workspace_id", data.workspace_id).order("name"),
      db.from("folders").select("id,name,parent_id,color_tag").eq("workspace_id", data.workspace_id).order("name"),
    ]);
    return { files: files.data ?? [], folders: folders.data ?? [] };
  });

export const createWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspace_id: z.string().uuid(), folder_id: z.string().uuid().nullable().optional(), name: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const tenantId = await workspaceTenant(db, data.workspace_id);
    await access(db, context.userId, tenantId);
    await ensureFolderInWorkspace(db, data.folder_id, data.workspace_id);
    const ext = data.name.split(".").pop()?.toLowerCase() ?? "js";
    const language = EXT_TO_LANG[ext] ?? "javascript";
    const starter = language === "python" ? "print('Hello from CodeLearn AI')\n" : language === "html" ? "<h1>Hello from CodeLearn AI</h1>\n" : language === "sql" ? "select 'Hello from CodeLearn AI' as message;\n" : "console.log('Hello from CodeLearn AI');\n";
    const { data: file, error } = await db.from("files").insert({ tenant_id: tenantId, workspace_id: data.workspace_id, folder_id: data.folder_id ?? null, created_by: context.userId, name: data.name, language, content: starter }).select("*").single();
    if (error) throw error;
    await db.from("activity_logs").insert({ tenant_id: tenantId, created_by: context.userId, action: "file_created", metadata: { name: data.name } });
    return { file };
  });

export const createWorkspaceFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspace_id: z.string().uuid(), name: z.string().min(1).max(80), parent_id: z.string().uuid().nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const tenantId = await workspaceTenant(db, data.workspace_id);
    await access(db, context.userId, tenantId);
    await ensureFolderInWorkspace(db, data.parent_id, data.workspace_id);
    const { data: folder, error } = await db.from("folders").insert({ tenant_id: tenantId, workspace_id: data.workspace_id, parent_id: data.parent_id ?? null, created_by: context.userId, name: data.name }).select("id,name,parent_id").single();
    if (error) throw error;
    return { folder };
  });

export const updateWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), content: z.string().max(100000).optional(), name: z.string().min(1).max(120).optional(), language: z.string().max(40).optional(), folder_id: z.string().uuid().nullable().optional(), color_tag: z.enum(["red","yellow","green","blue","purple"]).nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: existing } = await db.from("files").select("tenant_id,workspace_id").eq("id", data.id).single();
    await access(db, context.userId, existing?.tenant_id);
    if (data.folder_id !== undefined) await ensureFolderInWorkspace(db, data.folder_id, existing?.workspace_id as string);
    const patch: Record<string, unknown> = {};
    if (data.content !== undefined) patch.content = data.content;
    if (data.name !== undefined) patch.name = data.name;
    if (data.language !== undefined) patch.language = data.language;
    if (data.folder_id !== undefined) patch.folder_id = data.folder_id;
    if (data.color_tag !== undefined) patch.color_tag = data.color_tag;
    const { data: file, error } = await (db.from("files") as any).update(patch).eq("id", data.id).select("*").single();
    if (error) throw error;
    return { file };
  });

export const updateWorkspaceFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: z.string().min(1).max(80).optional(), parent_id: z.string().uuid().nullable().optional(), color_tag: z.enum(["red","yellow","green","blue","purple"]).nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: existing, error: existingError } = await db.from("folders").select("tenant_id,workspace_id,parent_id").eq("id", data.id).single();
    if (existingError || !existing) throw new Error("Folder not found");
    await access(db, context.userId, existing.tenant_id);
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.color_tag !== undefined) patch.color_tag = data.color_tag;
    if (data.parent_id !== undefined) {
      await ensureFolderInWorkspace(db, data.parent_id, existing.workspace_id);
      const { data: allFolders } = await db.from("folders").select("id,parent_id").eq("workspace_id", existing.workspace_id);
      if (wouldCreateFolderCycle((allFolders ?? []) as any[], data.id, data.parent_id)) throw new Error("Cannot move a folder inside itself");
      patch.parent_id = data.parent_id;
    }
    const { data: folder, error } = await (db.from("folders") as any).update(patch).eq("id", data.id).select("id,name,parent_id,color_tag").single();
    if (error) throw error;
    return { folder };
  });

export const deleteWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: existing } = await db.from("files").select("tenant_id").eq("id", data.id).single();
    await access(db, context.userId, existing?.tenant_id);
    const { error } = await db.from("files").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteWorkspaceFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: existing, error: existingError } = await db.from("folders").select("tenant_id").eq("id", data.id).single();
    if (existingError || !existing) throw new Error("Folder not found");
    await access(db, context.userId, existing.tenant_id);
    const { error } = await db.from("folders").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });