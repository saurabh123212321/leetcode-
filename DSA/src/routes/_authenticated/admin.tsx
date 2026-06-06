import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, highestRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Users, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const { profile, roles } = useAuth();
  const role = highestRole(roles);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [tenantName, setTenantName] = useState("");

  async function load() {
    if (!profile?.tenant_id) return;
    const tid = profile.tenant_id;
    const [{ data: ur }, { data: pr }, { data: t }, { data: tn }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role").eq("tenant_id", tid),
      supabase.from("profiles").select("id,email,full_name").eq("tenant_id", tid),
      supabase.from("support_tickets").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
      supabase.from("tenants").select("name").eq("id", tid).single(),
    ]);
    const map = new Map<string, any>();
    (pr ?? []).forEach((p: any) => map.set(p.id, { ...p, role: "student" }));
    (ur ?? []).forEach((r: any) => { const u = map.get(r.user_id); if (u) u.role = r.role; });
    setUsers(Array.from(map.values()));
    setTickets(t ?? []);
    if (tn) setTenantName(tn.name);
  }
  useEffect(() => { load(); }, [profile?.tenant_id]);

  if (role === "student" || role === "mentor") {
    return <div className="p-8"><AlertCircle className="inline mr-2" />Admins only</div>;
  }

  async function postAnnouncement() {
    if (!annTitle.trim() || !profile) return;
    await supabase.from("announcements").insert({
      tenant_id: profile.tenant_id ?? "", created_by: profile.id, title: annTitle, body: annBody,
    });
    toast.success("Announcement posted");
    setAnnTitle(""); setAnnBody("");
  }

  async function updateRole(uid: string, newRole: string) {
    if (!profile?.tenant_id) return;
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("tenant_id", profile.tenant_id);
    await supabase.from("user_roles").insert({ user_id: uid, tenant_id: profile.tenant_id, role: newRole as any });
    toast.success("Role updated");
    load();
  }

  async function updateTicket(id: string, status: string) {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    load();
  }

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <h1 className="text-3xl font-bold mb-2">{tenantName} • Admin</h1>
      <p className="text-slate-400 mb-8">Manage users, announcements, and support.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Megaphone size={16} /> Post announcement</h2>
          <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Title"
            className="w-full bg-slate-800 px-3 py-2 rounded mb-2 text-sm" />
          <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Body" rows={3}
            className="w-full bg-slate-800 px-3 py-2 rounded mb-2 text-sm" />
          <button onClick={postAnnouncement} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">Publish</button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="font-semibold mb-3">Support tickets</h2>
          {tickets.length === 0 ? <div className="text-sm text-slate-500">No tickets.</div> : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {tickets.map((t) => (
                <li key={t.id} className="text-sm border-l-2 border-amber-500 pl-2">
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-slate-400">{t.status} • {t.priority}</div>
                  <select value={t.status} onChange={(e) => updateTicket(t.id, e.target.value)}
                    className="mt-1 text-xs bg-slate-800 rounded px-1">
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 border-b border-slate-800">
              <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Role</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/50">
                  <td className="p-2">{u.full_name ?? "—"}</td>
                  <td className="p-2 text-slate-400">{u.email}</td>
                  <td className="p-2">
                    <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}
                      className="bg-slate-800 px-2 py-1 rounded text-xs">
                      <option value="student">Student</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
