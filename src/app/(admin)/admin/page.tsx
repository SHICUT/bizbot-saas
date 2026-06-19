"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Users, MessageSquare, Calendar, CreditCard, Building,
  Search, X, Zap, Clock, Shield, BarChart2, Megaphone, Globe,
  RefreshCw, AlertTriangle, CheckCircle, Tag
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Stats {
  totalBusinesses: number; activeBusinesses: number; trialUsers: number;
  paidUsers: number; expiredUsers: number; whatsappConnected: number;
  totalLeads: number; totalConversations: number; totalBroadcasts: number;
  totalAppointments: number; totalMessages: number; mrr: number; arr: number;
}
interface Business {
  id: string; name: string; owner_name: string; email: string; phone: string;
  type: string; plan: string; status: string; whatsapp_connected: boolean;
  created_at: string; expiry_date: string | null; remaining_days: number;
  leads_count: number; messages_used: number; message_limit: number;
  onboarding_completed: boolean;
}
interface HealthCheck { name: string; status: "healthy" | "warning" | "offline"; responseMs: number; message: string; category: string; }
interface HealthAlert { level: "critical" | "high" | "medium"; message: string; }
interface HealthData { overall: string; checks: HealthCheck[]; errors: { failedMessages1h: number; failedMessages24h: number }; whatsapp: { connected: number; disconnected: number; lastInbound: string | null; lastOutbound: string | null }; alerts: HealthAlert[]; timestamp: string; }
interface AuditLog { id: string; admin_id: string; business_id: string | null; action: string; metadata: Record<string, unknown>; created_at: string; }

type Tab = "overview" | "health" | "logs";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<{ stats: Stats; businesses: Business[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.status === 403) { setError("Access denied. Super Admin only."); setLoading(false); return; }
      setData(await res.json());
    } catch { setError("Failed to load"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function loadHealth() {
    const res = await fetch("/api/admin/health");
    if (res.ok) setHealth(await res.json());
  }

  async function loadLogs(page = 1) {
    const res = await fetch(`/api/admin/audit-logs?page=${page}`);
    if (res.ok) { const d = await res.json(); setLogs(d.logs || []); setLogsTotal(d.total || 0); setLogsPage(page); }
  }

  useEffect(() => { if (tab === "health") loadHealth(); if (tab === "logs") loadLogs(); }, [tab]);

  // Auto-refresh health every 30s
  useEffect(() => {
    if (tab !== "health") return;
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  async function runAction(action: string, params: Record<string, unknown> = {}) {
    if (!selectedBiz) return;
    setActionLoading(true); setActionMsg(null);
    try {
      const res = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, businessId: selectedBiz.id, ...params }) });
      const d = await res.json();
      setActionMsg(res.ok ? `✓ ${d.message}` : `✗ ${d.error}`);
      if (res.ok) loadData();
    } catch { setActionMsg("✗ Action failed"); }
    setActionLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><Shield className="w-12 h-12 text-red-300 mx-auto mb-3" /><p className="text-lg font-bold text-red-600">{error}</p></div></div>;
  if (!data) return null;

  const { stats, businesses } = data;
  const filtered = businesses.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== "all" && b.plan !== planFilter) return false;
    if (statusFilter === "active" && b.status !== "active") return false;
    if (statusFilter === "trialing" && b.status !== "trialing") return false;
    if (statusFilter === "expired" && b.status !== "expired") return false;
    if (statusFilter === "whatsapp" && !b.whatsapp_connected) return false;
    return true;
  });
  const expiringSoon = businesses.filter((b) => b.remaining_days > 0 && b.remaining_days <= 7);

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold">Super Admin</h1><p className="text-sm text-text-muted">Platform Control Center</p></div>
        <div className="flex items-center gap-2">
          <a href="/admin/users"><Button size="sm" variant="secondary"><Users className="w-3.5 h-3.5" />Users</Button></a>
          <a href="/admin/coupons"><Button size="sm" variant="secondary"><Tag className="w-3.5 h-3.5" />Coupons</Button></a>
          <a href="/admin/demo"><Button size="sm" variant="secondary"><Zap className="w-3.5 h-3.5" />Demo</Button></a>
          <Badge variant="info">Admin</Badge>
          <Button size="sm" variant="secondary" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([["overview", "Overview"], ["health", "System Health"], ["logs", "Audit Logs"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"}`}>{label}</button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === "overview" && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <SC icon={Building} label="Businesses" value={stats.totalBusinesses} />
            <SC icon={Users} label="Active" value={stats.activeBusinesses} c="emerald" />
            <SC icon={Clock} label="Trial" value={stats.trialUsers} c="amber" />
            <SC icon={CreditCard} label="Paid" value={stats.paidUsers} c="indigo" />
            <SC icon={Zap} label="Expired" value={stats.expiredUsers} c="red" />
            <SC icon={Globe} label="WhatsApp" value={stats.whatsappConnected} c="emerald" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <SC icon={Users} label="Leads" value={stats.totalLeads} />
            <SC icon={MessageSquare} label="Messages" value={stats.totalMessages} />
            <SC icon={Megaphone} label="Broadcasts" value={stats.totalBroadcasts} />
            <SC icon={Calendar} label="Appointments" value={stats.totalAppointments} />
            <SC icon={BarChart2} label="MRR" value={stats.mrr} p="$" c="emerald" />
            <SC icon={BarChart2} label="ARR" value={stats.arr} p="$" c="indigo" />
          </div>

          {/* Subscription Alerts */}
          {expiringSoon.length > 0 && (
            <Card className="mb-4 bg-amber-50/50 border-amber-200">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-sm font-bold text-amber-900">Expiring Soon ({expiringSoon.length})</span></div>
              <div className="flex flex-wrap gap-2">
                {expiringSoon.slice(0, 5).map((b) => (
                  <span key={b.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{b.name} — {b.remaining_days}d left</span>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 w-full sm:w-56">
              <Search className="w-4 h-4 text-text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm focus:outline-none w-full" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-text-muted" /></button>}
            </div>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white">
              <option value="all">All Plans</option><option value="trial">Trial</option><option value="starter">Starter</option><option value="growth">Growth</option><option value="business">Business</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white">
              <option value="all">All Status</option><option value="active">Active</option><option value="trialing">Trial</option><option value="expired">Expired</option><option value="whatsapp">WhatsApp</option>
            </select>
            <span className="text-xs text-text-muted ml-auto">{filtered.length} results</span>
          </div>

          {/* Business Table */}
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Business</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">WA</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">Leads</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Expires</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((biz) => (
                    <tr key={biz.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3"><p className="font-medium truncate max-w-[140px]">{biz.name}</p><p className="text-xs text-text-muted truncate max-w-[140px]">{biz.email}</p></td>
                      <td className="px-4 py-3 hidden md:table-cell"><Badge variant={biz.plan === "business" ? "success" : biz.plan === "growth" ? "info" : "default"}>{biz.plan}</Badge></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Badge variant={biz.status === "active" ? "success" : biz.status === "trialing" ? "warning" : "danger"}>{biz.status}</Badge></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><span className={`w-2.5 h-2.5 rounded-full inline-block ${biz.whatsapp_connected ? "bg-emerald-500" : "bg-gray-300"}`} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">{biz.leads_count}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs">{biz.remaining_days > 0 ? `${biz.remaining_days}d` : <span className="text-red-500">Expired</span>}</td>
                      <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => { setSelectedBiz(biz); setActionMsg(null); }}>Manage</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="p-8 text-center text-sm text-text-muted">No results</p>}
          </Card>
        </>
      )}

      {/* ─── HEALTH TAB ─── */}
      {tab === "health" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">System Health</h2>
            <Button size="sm" variant="secondary" onClick={loadHealth}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
          </div>
          {!health ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Overall Status */}
              <Card className={`mb-4 ${health.overall === "healthy" ? "bg-emerald-50/50 border-emerald-200" : health.overall === "warning" ? "bg-amber-50/50 border-amber-200" : "bg-red-50/50 border-red-200"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${health.overall === "healthy" ? "bg-emerald-100" : health.overall === "warning" ? "bg-amber-100" : "bg-red-100"}`}>
                    {health.overall === "healthy" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : health.overall === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <X className="w-5 h-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{health.overall === "healthy" ? "All Systems Operational" : health.overall === "warning" ? "Some Services Degraded" : "Critical Issues Detected"}</p>
                    <p className="text-xs text-text-muted">Last checked: {new Date(health.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </Card>

              {/* Alerts */}
              {health.alerts.length > 0 && (
                <div className="space-y-2 mb-4">
                  {health.alerts.map((alert, i) => (
                    <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${alert.level === "critical" ? "bg-red-100 text-red-800 border border-red-200" : alert.level === "high" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
                      {alert.level === "critical" ? "🔴" : alert.level === "high" ? "🟡" : "🔵"} {alert.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Error Counts */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card><p className="text-xs text-text-muted">Failed Messages (1h)</p><p className={`text-xl font-bold ${health.errors.failedMessages1h > 0 ? "text-red-600" : "text-emerald-600"}`}>{health.errors.failedMessages1h}</p></Card>
                <Card><p className="text-xs text-text-muted">Failed Messages (24h)</p><p className={`text-xl font-bold ${health.errors.failedMessages24h > 5 ? "text-red-600" : health.errors.failedMessages24h > 0 ? "text-amber-600" : "text-emerald-600"}`}>{health.errors.failedMessages24h}</p></Card>
              </div>

              {/* WhatsApp Health */}
              <Card className="mb-4">
                <div className="flex items-center gap-2 mb-3"><Globe className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-bold">WhatsApp Health</h3></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><p className="text-xs text-text-muted">Connected</p><p className="text-lg font-bold text-emerald-600">{health.whatsapp.connected}</p></div>
                  <div><p className="text-xs text-text-muted">Disconnected</p><p className="text-lg font-bold text-text-muted">{health.whatsapp.disconnected}</p></div>
                  <div><p className="text-xs text-text-muted">Last Inbound</p><p className="text-sm font-medium">{health.whatsapp.lastInbound ? timeAgoStr(health.whatsapp.lastInbound) : "Never"}</p></div>
                  <div><p className="text-xs text-text-muted">Last Outbound</p><p className="text-sm font-medium">{health.whatsapp.lastOutbound ? timeAgoStr(health.whatsapp.lastOutbound) : "Never"}</p></div>
                </div>
              </Card>

              {/* Service Checks */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {health.checks.map((check) => (
                  <Card key={check.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{check.name}</span>
                      <span className={`w-3 h-3 rounded-full ${check.status === "healthy" ? "bg-emerald-500" : check.status === "warning" ? "bg-amber-500" : "bg-red-500"}`} />
                    </div>
                    <p className="text-xs text-text-muted">{check.message}</p>
                    {check.responseMs > 0 && <p className="text-[10px] text-text-muted mt-1">{check.responseMs}ms</p>}
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── AUDIT LOGS TAB ─── */}
      {tab === "logs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Audit Logs</h2>
            <span className="text-xs text-text-muted">{logsTotal} total entries</span>
          </div>
          {logs.length === 0 ? (
            <Card><p className="text-center py-8 text-sm text-text-muted">No audit logs yet. Actions will be recorded here.</p></Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-text-muted">{new Date(log.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <Badge variant="default">{log.action}</Badge>
                  </div>
                ))}
              </div>
              {logsTotal > 20 && (
                <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
                  <Button size="sm" variant="ghost" disabled={logsPage <= 1} onClick={() => loadLogs(logsPage - 1)}>Prev</Button>
                  <span className="text-xs text-text-muted">Page {logsPage}</span>
                  <Button size="sm" variant="ghost" disabled={logsPage * 20 >= logsTotal} onClick={() => loadLogs(logsPage + 1)}>Next</Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ─── BUSINESS MANAGE MODAL ─── */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedBiz(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Manage Business</h3>
              <button onClick={() => setSelectedBiz(null)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {actionMsg && <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${actionMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{actionMsg}</div>}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Name</p><p className="text-sm font-medium">{selectedBiz.name}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Owner</p><p className="text-sm font-medium">{selectedBiz.owner_name || "—"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Email</p><p className="text-sm font-medium truncate">{selectedBiz.email || "—"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Phone</p><p className="text-sm font-medium">{selectedBiz.phone || "—"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Type</p><p className="text-sm font-medium capitalize">{selectedBiz.type}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Plan</p><Badge variant={selectedBiz.plan === "business" ? "success" : selectedBiz.plan === "growth" ? "info" : "default"}>{selectedBiz.plan}</Badge></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Status</p><Badge variant={selectedBiz.status === "active" ? "success" : selectedBiz.status === "trialing" ? "warning" : "danger"}>{selectedBiz.status}</Badge></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">WhatsApp</p><p className="text-sm">{selectedBiz.whatsapp_connected ? "✅ Connected" : "❌ Off"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Remaining</p><p className="text-sm font-medium">{selectedBiz.remaining_days > 0 ? `${selectedBiz.remaining_days} days` : "Expired"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Expiry</p><p className="text-sm font-medium">{selectedBiz.expiry_date ? new Date(selectedBiz.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Leads</p><p className="text-sm font-medium">{selectedBiz.leads_count}</p></div>
              <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-text-muted uppercase">Messages</p><p className="text-sm font-medium">{selectedBiz.messages_used}/{selectedBiz.message_limit}</p></div>
              <div className="p-3 rounded-lg bg-gray-50 col-span-2"><p className="text-[10px] text-text-muted uppercase">Created</p><p className="text-sm font-medium">{new Date(selectedBiz.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div>
            </div>

            <p className="text-xs font-bold text-text-muted uppercase mb-2">Admin Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("extend_trial", { days: 7 })}>+7 Days</Button>
              <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("extend_trial", { days: 30 })}>+30 Days</Button>
              <Button size="sm" disabled={actionLoading} onClick={() => runAction("upgrade_plan", { plan: "starter" })}>→ Starter</Button>
              <Button size="sm" disabled={actionLoading} onClick={() => runAction("upgrade_plan", { plan: "growth" })}>→ Growth</Button>
              <Button size="sm" disabled={actionLoading} onClick={() => runAction("upgrade_plan", { plan: "business" })}>→ Business</Button>
              <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("reset_messages")}>Reset Msgs</Button>
            </div>
            <Button size="sm" variant="danger" className="w-full mt-3" disabled={actionLoading} onClick={() => runAction("cancel_subscription")}>Cancel Subscription</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SC({ icon: Icon, label, value, p, c }: { icon: typeof Users; label: string; value: number; p?: string; c?: string }) {
  const colors: Record<string, string> = { emerald: "text-emerald-600", indigo: "text-indigo-600", amber: "text-amber-600", red: "text-red-500" };
  return (
    <Card><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-text-muted flex-shrink-0" /><div><p className={`text-lg font-bold ${colors[c || ""] || ""}`}>{p || ""}{value.toLocaleString()}</p><p className="text-[10px] text-text-muted">{label}</p></div></div></Card>
  );
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
