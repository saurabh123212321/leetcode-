import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, highestRole } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { createManagedUser, createTenantAccount, getSuperAdminOverview } from "@/lib/admin.functions";
import { Building2, AlertCircle, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin")({ component: SuperAdminPage });

function SuperAdminPage() {
  const { roles } = useAuth();
  const role = highestRole(roles);
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [tenantForm, setTenantForm] = useState({ tenant_name: "", slug: "", admin_email: "", admin_password: "Admin@123456", admin_name: "" });
  const [userForm, setUserForm] = useState({ tenant_id: "", full_name: "", email: "", password: "Student@123", role: "student" });
  const overviewFn = useServerFn(getSuperAdminOverview);
  const createTenantFn = useServerFn(createTenantAccount);
  const createUserFn = useServerFn(createManagedUser);

  async function load() {
    if (role !== "super_admin") return;
    const res = await overviewFn();
    setRows(res.tenants ?? []);
    if (!userForm.tenant_id && res.tenants?.[0]?.tenant?.id) setUserForm((p) => ({ ...p, tenant_id: res.tenants[0].tenant.id }));
  }

  useEffect(() => {
    load();
  }, [role]);

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createTenantFn({ data: tenantForm });
      toast.success("Tenant and admin login created");
      setTenantForm({ tenant_name: "", slug: "", admin_email: "", admin_password: "Admin@123456", admin_name: "" });
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createUserFn({ data: userForm as any });
      toast.success("User login created");
      setUserForm((p) => ({ ...p, full_name: "", email: "", password: p.role === "mentor" ? "Mentor@123" : "Student@123" }));
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  if (role !== "super_admin") return <div className="p-8"><AlertCircle className="inline mr-2" />Super admin only</div>;

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Building2 /> Super Admin Control Center</h1>
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <form onSubmit={createTenant} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Plus size={16} /> Create tenant + admin account</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <input required value={tenantForm.tenant_name} onChange={(e) => setTenantForm({ ...tenantForm, tenant_name: e.target.value })} placeholder="Tenant name" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required value={tenantForm.slug} onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="tenant-slug" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required value={tenantForm.admin_name} onChange={(e) => setTenantForm({ ...tenantForm, admin_name: e.target.value })} placeholder="Admin full name" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required type="email" value={tenantForm.admin_email} onChange={(e) => setTenantForm({ ...tenantForm, admin_email: e.target.value })} placeholder="admin@company.com" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required value={tenantForm.admin_password} onChange={(e) => setTenantForm({ ...tenantForm, admin_password: e.target.value })} placeholder="Password" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <button disabled={busy} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm disabled:opacity-50">{busy ? "Creating…" : "Create tenant"}</button>
        </form>
        <form onSubmit={createUser} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Users size={16} /> Create student / mentor / admin login</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={userForm.tenant_id} onChange={(e) => setUserForm({ ...userForm, tenant_id: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              {rows.map((r) => <option key={r.tenant.id} value={r.tenant.id}>{r.tenant.name}</option>)}
            </select>
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value, password: e.target.value === "mentor" ? "Mentor@123" : e.target.value === "admin" ? "Admin@123" : "Student@123" })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="student">Student</option><option value="mentor">Mentor</option><option value="admin">Admin</option>
            </select>
            <input required value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Full name" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@tenant.com" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
            <input required value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Password" className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <button disabled={busy || rows.length === 0} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm disabled:opacity-50">{busy ? <Loader2 className="inline animate-spin" size={14} /> : "Create user"}</button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((row) => {
          const t = row.tenant;
          const s = row.stats ?? {};
          return (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-lg font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.slug}.codelearn.com</div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded capitalize">{t.plan}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-slate-950 p-2 rounded"><div className="text-lg font-bold">{s.users ?? 0}</div><div className="text-xs text-slate-500">Users</div></div>
                <div className="bg-slate-950 p-2 rounded"><div className="text-lg font-bold">{s.files ?? 0}</div><div className="text-xs text-slate-500">Files</div></div>
                <div className="bg-slate-950 p-2 rounded"><div className="text-lg font-bold">{s.quizzes ?? 0}</div><div className="text-xs text-slate-500">Quizzes</div></div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
                <div className="bg-slate-950 p-2 rounded"><b>{s.notes ?? 0}</b><br />Notes</div>
                <div className="bg-slate-950 p-2 rounded"><b>{s.chats ?? 0}</b><br />AI chats</div>
                <div className="bg-slate-950 p-2 rounded"><b>{s.submissions ?? 0}</b><br />Runs</div>
                <div className="bg-slate-950 p-2 rounded"><b>{s.activities ?? 0}</b><br />Events</div>
              </div>
              {s.subscription && (
                <div className="mt-3 text-xs text-slate-400">
                  Revenue: ${s.subscription.monthly_revenue ?? 0}/mo • Storage: {s.subscription.storage_used_mb ?? 0}MB • AI tokens: {s.subscription.ai_tokens_used ?? 0}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
