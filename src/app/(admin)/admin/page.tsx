"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Users, MessageSquare, Calendar, CreditCard, Building, Eye, StickyNote, DollarSign } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";

interface AdminData {
  stats: { totalBusinesses: number; activeBusinesses: number; trialUsers: number; paidUsers: number; totalLeads: number; totalMessages: number; totalAppointments: number; totalRevenue?: number; mrr?: number; churnRate?: number };
  businesses: Array<{ id: string; name: string; type: string; plan: string; email: string; phone: string; created_at: string; whatsapp_connected: boolean; onboarding_completed: boolean; subscription: { plan: string; status: string; messages_used: number; message_limit: number } | null }>;
}

interface BusinessDetail {
  business: Record<string, unknown>;
  leads: Array<{ id: string; name: string; phone: string; status: string; source: string; created_at: string }>;
  conversations: Array<{ id: string; last_message_text: string; last_message_at: string; leads: { name: string; phone: string } }>;
  appointments: Array<{ id: string; title: string; scheduled_at: string; status: string }>;
  totalMessages: number;
  subscription: Record<string, unknown>;
  adminNotes: Array<{ id: string; note: string; created_at: string }>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<BusinessDetail | null>(null);
  const [viewingBizId, setViewingBizId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetch("/api/admin").then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); setLoading(false); return; }
      setData(d);
      setLoading(false);
    }).catch(() => { setError("Failed to load admin data"); setLoading(false); });
  }, []);

  async function viewBusiness(id: string) {
    setViewingBizId(id);
    const res = await fetch(`/api/admin/business?id=${id}`);
    const d = await res.json();
    if (!res.ok) { setError(d.error); setViewingBizId(null); return; }
    setSelectedBiz(d);
  }

  async function addNote(businessId: string) {
    if (!noteText.trim()) return;
    await fetch("/api/admin/business", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, note: noteText }) });
    setNoteText("");
    viewBusiness(businessId); // Refresh
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-lg font-bold text-red-600 mb-2">Access Denied</p><p className="text-sm text-text-muted">{error}</p><a href="/" className="text-primary text-sm mt-4 inline-block">← Back to Dashboard</a></div></div>;
  if (!data) return null;

  // Drill-down view
  if (selectedBiz) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <button onClick={() => setSelectedBiz(null)} className="text-sm text-primary mb-4 hover:underline">← Back to All Businesses</button>
        <h1 className="text-2xl font-bold mb-6">{(selectedBiz.business as { name?: string }).name || "Business"}</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card><p className="text-xs text-text-muted">Leads</p><p className="text-xl font-bold">{selectedBiz.leads.length}</p></Card>
          <Card><p className="text-xs text-text-muted">Messages</p><p className="text-xl font-bold">{selectedBiz.totalMessages}</p></Card>
          <Card><p className="text-xs text-text-muted">Appointments</p><p className="text-xl font-bold">{selectedBiz.appointments.length}</p></Card>
          <Card><p className="text-xs text-text-muted">Conversations</p><p className="text-xl font-bold">{selectedBiz.conversations.length}</p></Card>
        </div>

        {/* Leads */}
        <Card className="mb-4" padding="none">
          <div className="p-4 border-b border-border"><h3 className="text-sm font-bold">Leads ({selectedBiz.leads.length})</h3></div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {selectedBiz.leads.map((l) => (
              <div key={l.id} className="p-3 flex items-center justify-between">
                <div><p className="text-sm font-medium">{l.name || l.phone}</p><p className="text-xs text-text-muted">{l.source} • {new Date(l.created_at).toLocaleDateString()}</p></div>
                <Badge variant={l.status === "qualified" ? "success" : l.status === "new" ? "info" : "default"}>{l.status}</Badge>
              </div>
            ))}
            {selectedBiz.leads.length === 0 && <p className="p-4 text-sm text-text-muted">No leads</p>}
          </div>
        </Card>

        {/* Admin Notes */}
        <Card className="mb-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><StickyNote className="w-4 h-4" /> Internal Notes</h3>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {selectedBiz.adminNotes.map((n) => (
              <div key={n.id} className="p-2 bg-yellow-50 rounded-lg text-xs"><p>{n.note}</p><p className="text-text-muted mt-1">{new Date(n.created_at).toLocaleString()}</p></div>
            ))}
            {selectedBiz.adminNotes.length === 0 && <p className="text-xs text-text-muted">No notes yet</p>}
          </div>
          <div className="flex gap-2">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-border" placeholder="Add internal note..." />
            <Button size="sm" onClick={() => addNote(viewingBizId!)}>Add</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Super Admin</h1><p className="text-sm text-text-muted">BizBot Platform Overview</p></div>
        <Badge variant="info">Admin</Badge>
      </div>

      {/* Platform Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building} label="Total Businesses" value={data.stats.totalBusinesses} />
        <StatCard icon={Users} label="Active" value={data.stats.activeBusinesses} />
        <StatCard icon={CreditCard} label="Paid Users" value={data.stats.paidUsers} />
        <StatCard icon={Users} label="Trial Users" value={data.stats.trialUsers} />
        <StatCard icon={Users} label="Total Leads" value={data.stats.totalLeads} />
        <StatCard icon={MessageSquare} label="Total Messages" value={data.stats.totalMessages} />
        <StatCard icon={Calendar} label="Appointments" value={data.stats.totalAppointments} />
        <StatCard icon={DollarSign} label="MRR" value={data.stats.mrr || 0} isCurrency />
      </motion.div>

      {/* Businesses Table */}
      <Card padding="none">
        <div className="p-4 border-b border-border"><h2 className="text-sm font-bold">All Businesses ({data.businesses.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-gray-50/50">
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">Business</th>
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">Type</th>
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">Plan</th>
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">Usage</th>
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">WhatsApp</th>
              <th className="text-left text-xs font-medium text-text-muted py-3 px-4">Action</th>
            </tr></thead>
            <tbody>
              {data.businesses.map((b) => (
                <tr key={b.id} className="border-b border-border hover:bg-gray-50/50">
                  <td className="py-3 px-4"><p className="text-sm font-medium">{b.name}</p><p className="text-xs text-text-muted">{b.email}</p></td>
                  <td className="py-3 px-4"><span className="text-xs capitalize">{b.type}</span></td>
                  <td className="py-3 px-4"><Badge variant={b.subscription?.status === "active" ? "success" : b.subscription?.status === "trialing" ? "warning" : "default"}>{b.plan}</Badge></td>
                  <td className="py-3 px-4"><span className="text-xs">{b.subscription?.messages_used || 0}/{b.subscription?.message_limit || 0}</span></td>
                  <td className="py-3 px-4"><Badge variant={b.whatsapp_connected ? "success" : "default"}>{b.whatsapp_connected ? "Yes" : "No"}</Badge></td>
                  <td className="py-3 px-4"><button onClick={() => viewBusiness(b.id)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, isCurrency }: { icon: typeof Users; label: string; value: number; isCurrency?: boolean }) {
  return <Card><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div><div><p className="text-xs text-text-muted">{label}</p><p className="text-xl font-bold">{isCurrency ? formatINR(value) : value}</p></div></div></Card>;
}
