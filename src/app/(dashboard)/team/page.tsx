"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Save, Users, X, CheckCircle, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface TeamMember {
  id: string; name: string; email: string | null; phone: string | null;
  wa_id: string | null; role: string; is_active: boolean;
  specializations: string[]; leads_assigned: number; last_assigned_at: string | null;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "sales_head", label: "Sales Head" },
  { value: "sales", label: "Sales Executive" },
  { value: "telecaller", label: "Telecaller" },
  { value: "support", label: "Support" },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<TeamMember> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadTeam(); }, []);

  async function loadTeam() {
    const res = await fetch("/api/team");
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
  }

  async function saveMember() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    const method = isNew ? "POST" : "PUT";
    const res = await fetch("/api/team", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setMsg({ type: "success", text: isNew ? "Team member added!" : "Updated!" });
      setEditing(null); setIsNew(false); loadTeam();
    } else {
      const e = await res.json(); setMsg({ type: "error", text: e.error || "Failed" });
    }
    setSaving(false); setTimeout(() => setMsg(null), 3000);
  }

  async function toggleActive(member: TeamMember) {
    await fetch("/api/team", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, is_active: !member.is_active }),
    });
    loadTeam();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Team Management" description="Manage your sales team and roles" />
      {msg && <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}</div>}

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-text-muted">{members.length} team members</p>
        <Button onClick={() => { setEditing({ name: "", role: "sales", specializations: [], is_active: true }); setIsNew(true); }}>
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {/* Add/Edit Form */}
      {editing && (
        <Card className="mb-6">
          <h3 className="text-sm font-bold mb-4">{isNew ? "Add Team Member" : "Edit Member"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" onKeyDown={(e) => { const t = e.target as HTMLElement; if (t.tagName === "INPUT") e.stopPropagation(); }}>
            <div><label className="text-xs font-medium block mb-1">Name *</label><input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20" placeholder="Full name" /></div>
            <div><label className="text-xs font-medium block mb-1">Phone</label><input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value, wa_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20" placeholder="+91 98765 43210" /></div>
            <div><label className="text-xs font-medium block mb-1">Email</label><input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20" placeholder="email@company.com" /></div>
            <div><label className="text-xs font-medium block mb-1">Role</label><select value={editing.role || "sales"} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border">{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-medium block mb-1">Specializations (comma separated)</label><input value={(editing.specializations || []).join(", ")} onChange={(e) => setEditing({ ...editing, specializations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20" placeholder="e.g. budget:50L+, location:Noida, project:Green Valley" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={saveMember} disabled={saving || !editing.name?.trim()}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isNew ? "Add" : "Save"}</Button>
            <Button variant="secondary" onClick={() => { setEditing(null); setIsNew(false); }}><X className="w-4 h-4" /> Cancel</Button>
          </div>
        </Card>
      )}

      {/* Team List */}
      {members.length === 0 ? (
        <Card><div className="text-center py-12"><Users className="w-12 h-12 text-text-muted/20 mx-auto mb-3" /><h3 className="text-sm font-bold mb-1">No team members</h3><p className="text-xs text-text-muted">Add your sales team to enable lead assignment</p></div></Card>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} padding="sm">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${m.is_active ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>{m.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${!m.is_active ? "text-text-muted line-through" : ""}`}>{m.name}</span>
                    <Badge variant={m.is_active ? "success" : "default"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-text-muted">{ROLES.find((r) => r.value === m.role)?.label || m.role}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-text-muted mt-0.5">
                    {m.phone && <span>{m.phone}</span>}
                    {m.email && <span>{m.email}</span>}
                    <span>{m.leads_assigned} leads</span>
                    {m.specializations.length > 0 && <span>🎯 {m.specializations.join(", ")}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setIsNew(false); }}>Edit</Button>
                  <Button size="sm" variant={m.is_active ? "ghost" : "secondary"} onClick={() => toggleActive(m)}>{m.is_active ? "Deactivate" : "Activate"}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
