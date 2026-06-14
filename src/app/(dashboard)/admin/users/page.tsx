"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Users, Shield, AlertTriangle, CheckCircle,
  Trash2, RotateCcw, Ban, Zap, Phone, MessageSquare, RefreshCw,
  ChevronLeft, ChevronRight, Eye
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface UserRow {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string;
  business_type: string;
  plan: string;
  subscription_status: string;
  messages_used: number;
  message_limit: number;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_verified_name: string | null;
  is_active: boolean;
  status: string;
  deleted_at: string | null;
  created_at: string;
  last_sign_in: string | null;
  onboarding_completed: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter });
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.status === 403) { setAccessDenied(true); setLoading(false); return; }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function runAction(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedUser) return;
    setActionLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, business_id: selectedUser.business_id, user_id: selectedUser.id, ...extra }),
    });
    const data = await res.json();
    setMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    setActionLoading(false);
    if (res.ok) fetchUsers();
  }

  async function permanentDelete() {
    if (!selectedUser || confirmDelete !== "DELETE") return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/users?business_id=${selectedUser.business_id}&confirm=DELETE`, { method: "DELETE" });
    const data = await res.json();
    setMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    setActionLoading(false);
    setConfirmDelete("");
    if (res.ok) { setSelectedUser(null); fetchUsers(); }
  }

  if (accessDenied) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><Shield className="w-12 h-12 text-red-300 mx-auto mb-3" /><p className="text-lg font-bold text-red-600">Access Denied</p><p className="text-sm text-text-muted">Super Admin required.</p></div>
    </div>
  );

  if (loading && users.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader title="User Management" description={`${total} total users`} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-text-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, phone..." className="bg-transparent text-sm focus:outline-none w-full" />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-text-muted" /></button>}
        </div>
        <div className="flex gap-1.5">
          {["all", "active", "suspended", "deleted"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={fetchUsers} className="ml-auto"><RefreshCw className="w-3.5 h-3.5" /></Button>
      </div>

      {/* Users Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Business</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.business_id} className={`hover:bg-gray-50/50 ${u.status === "deleted" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm truncate max-w-[160px]">{u.business_name || u.name}</p>
                    <p className="text-xs text-text-muted capitalize">{u.business_type}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-text-secondary truncate max-w-[180px]">{u.email}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge variant={u.plan === "business" ? "success" : u.plan === "growth" ? "info" : "default"}>{u.plan}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {u.whatsapp_connected ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><Phone className="w-3 h-3" />{u.whatsapp_phone_number || u.whatsapp_phone_number_id?.substring(0, 8)}</span>
                    ) : (
                      <span className="text-xs text-text-muted">Not connected</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={u.status === "active" ? "success" : u.status === "suspended" ? "warning" : "danger"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedUser(u); setMsg(null); setConfirmDelete(""); }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <p className="p-8 text-center text-sm text-text-muted">No users found</p>}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Manage User</h3>
                <button onClick={() => setSelectedUser(null)}><X className="w-5 h-5 text-text-muted" /></button>
              </div>

              {msg && <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${msg.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
                <Info label="Business" value={selectedUser.business_name} />
                <Info label="Email" value={selectedUser.email} />
                <Info label="Phone" value={selectedUser.phone || "—"} />
                <Info label="Type" value={selectedUser.business_type} />
                <Info label="Plan" value={`${selectedUser.plan} (${selectedUser.messages_used}/${selectedUser.message_limit})`} />
                <Info label="Status" value={selectedUser.status} />
                <Info label="WhatsApp" value={selectedUser.whatsapp_connected ? (selectedUser.whatsapp_phone_number || selectedUser.whatsapp_phone_number_id || "Connected") : "Not connected"} />
                <Info label="WA Name" value={selectedUser.whatsapp_verified_name || "—"} />
                <Info label="Created" value={new Date(selectedUser.created_at).toLocaleDateString()} />
                <Info label="Last Login" value={selectedUser.last_sign_in ? new Date(selectedUser.last_sign_in).toLocaleDateString() : "Never"} />
                <Info label="Onboarding" value={selectedUser.onboarding_completed ? "Complete" : "Incomplete"} />
                <Info label="Business ID" value={selectedUser.business_id.substring(0, 12) + "..."} />
              </div>

              {/* Actions */}
              <p className="text-xs font-bold text-text-muted uppercase mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("update_plan", { plan: "starter" })}><Zap className="w-3.5 h-3.5" /> → Starter</Button>
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("update_plan", { plan: "growth" })}><Zap className="w-3.5 h-3.5" /> → Growth</Button>
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("update_plan", { plan: "business" })}><Zap className="w-3.5 h-3.5" /> → Business</Button>
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={() => runAction("reset_usage")}><RefreshCw className="w-3.5 h-3.5" /> Reset Usage</Button>
              </div>

              {selectedUser.whatsapp_connected && (
                <Button size="sm" variant="secondary" className="w-full mb-2" disabled={actionLoading} onClick={() => runAction("disconnect_whatsapp")}><Phone className="w-3.5 h-3.5" /> Disconnect WhatsApp</Button>
              )}

              {/* Status Actions */}
              <div className="border-t border-border pt-4 mt-4 space-y-2">
                {selectedUser.status === "active" && (
                  <Button size="sm" variant="secondary" className="w-full" disabled={actionLoading} onClick={() => runAction("suspend")}><Ban className="w-3.5 h-3.5" /> Suspend Account</Button>
                )}
                {selectedUser.status === "suspended" && (
                  <Button size="sm" className="w-full" disabled={actionLoading} onClick={() => runAction("reactivate")}><CheckCircle className="w-3.5 h-3.5" /> Reactivate Account</Button>
                )}
                {selectedUser.status !== "deleted" && (
                  <Button size="sm" variant="danger" className="w-full" disabled={actionLoading} onClick={() => runAction("soft_delete")}><Trash2 className="w-3.5 h-3.5" /> Soft Delete (Recoverable)</Button>
                )}
                {selectedUser.status === "deleted" && (
                  <Button size="sm" className="w-full" disabled={actionLoading} onClick={() => runAction("restore")}><RotateCcw className="w-3.5 h-3.5" /> Restore Account</Button>
                )}
              </div>

              {/* Permanent Delete */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Permanent Delete (Irreversible)</p>
                <div className="flex gap-2">
                  <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder='Type "DELETE" to confirm' className="flex-1 px-3 py-2 text-xs rounded-lg border border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none" />
                  <Button size="sm" variant="danger" disabled={confirmDelete !== "DELETE" || actionLoading} onClick={permanentDelete}>Delete Forever</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-gray-50">
      <p className="text-[10px] text-text-muted uppercase">{label}</p>
      <p className="text-xs font-medium truncate">{value}</p>
    </div>
  );
}
