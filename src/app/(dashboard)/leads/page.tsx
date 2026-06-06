"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Download, Search, X, Loader2, Users, Phone, Mail,
  MessageSquare, Calendar, StickyNote, ChevronRight, TrendingUp,
  Clock, Send, ArrowRight, HelpCircle
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/layout/PageHeader";
import Tooltip from "@/components/ui/Tooltip";
import { formatUSD, formatUSDFull } from "@/lib/utils";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
type LeadTemp = "hot" | "warm" | "cold";

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: LeadStatus;
  source: string;
  lead_temperature: LeadTemp;
  score: number;
  estimated_value: number;
  message_count: number;
  created_at: string;
  last_message_at: string | null;
  business_name: string | null;
  last_activity_at: string | null;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

interface LeadNote {
  id: string;
  note: string;
  created_by: string;
  created_at: string;
}

interface PipelineStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  totalValue: number;
  avgScore: number;
}

const statusConfig: Record<LeadStatus, { label: string; variant: "info" | "default" | "warning" | "success" | "danger" }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  qualified: { label: "Qualified", variant: "warning" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
};

const tempConfig: Record<LeadTemp, { label: string; icon: string; color: string }> = {
  hot: { label: "Hot", icon: "🔥", color: "text-red-600" },
  warm: { label: "Warm", icon: "🟡", color: "text-amber-600" },
  cold: { label: "Cold", icon: "⚪", color: "text-gray-400" },
};

const timelineIcons: Record<string, string> = {
  first_contact: "📥",
  message: "💬",
  appointment_booked: "📅",
  appointment_completed: "✅",
  converted: "🎉",
  note_added: "📝",
  status_change: "🔄",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats>({ total: 0, hot: 0, warm: 0, cold: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0, totalValue: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | LeadStatus>("all");
  const [tempFilter, setTempFilter] = useState<"all" | LeadTemp>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "timeline" | "notes">("info");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLostReason, setShowLostReason] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (tempFilter !== "all") params.set("temperature", tempFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || { total: 0, hot: 0, warm: 0, cold: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0, totalValue: 0, avgScore: 0 });
    } catch (err) {
      console.error("[Leads] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, tempFilter, searchQuery]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function openProfile(lead: Lead) {
    setSelectedLead(lead);
    setProfileTab("info");
    setLoadingDetail(true);
    try {
      const [timelineRes, notesRes] = await Promise.all([
        fetch(`/api/leads/timeline?leadId=${lead.id}`),
        fetch(`/api/leads/notes?leadId=${lead.id}`),
      ]);
      if (timelineRes.ok) {
        const t = await timelineRes.json();
        setTimeline(t.events || []);
      }
      if (notesRes.ok) {
        const n = await notesRes.json();
        setNotes(n.notes || []);
      }
    } catch { /* silent */ }
    setLoadingDetail(false);
  }

  async function addNote() {
    if (!newNote.trim() || !selectedLead) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, note: newNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        setNewNote("");
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function updateLeadStatus(leadId: string, status: LeadStatus) {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l));
        if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status });
        setSuccessMsg("Status updated!");
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    } catch { /* silent */ }
  }

  async function handleAddLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email") || null,
          source: fd.get("source") || "manual",
          estimated_value: Number(fd.get("estimated_value")) || 0,
          notes: fd.get("notes") || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setSuccessMsg("Lead added!");
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchLeads();
      } else {
        const err = await res.json();
        setSuccessMsg(err.error || "Failed to add lead");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  function handleExport() {
    if (leads.length === 0) return;
    const csv = ["Name,Phone,Email,Status,Temperature,Score,Value,Source,Created"].concat(
      leads.map((l) => `"${l.name || ""}",${l.phone},"${l.email || ""}",${l.status},${l.lead_temperature},${l.score},${l.estimated_value},${l.source},${l.created_at}`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    setSuccessMsg("Exported!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Leads" description="CRM & Sales Pipeline" actionLabel="Add Lead" actionIcon={UserPlus} onAction={() => setShowAddModal(true)} />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            ✓ {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline Funnel */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Sales Pipeline</h3>
          <Tooltip text="Click any card to filter leads by that category" position="right" showIcon iconSize={14} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all ${activeFilter === "all" && tempFilter === "all" ? "ring-2 ring-primary" : ""}`} onClick={() => { setActiveFilter("all"); setTempFilter("all"); }}>
            <p className="text-2xl font-bold">{stats.total}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">Total Leads</p>
            </div>
          </Card>
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-red-200 transition-all ${tempFilter === "hot" ? "ring-2 ring-red-400" : ""}`} onClick={() => { setTempFilter("hot"); setActiveFilter("all"); }}>
            <p className="text-2xl font-bold text-red-600">{stats.hot}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">🔥 Hot Lead</p>
              <Tooltip text="Customer showed strong buying intent" position="bottom" showIcon iconSize={12} />
            </div>
          </Card>
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-amber-200 transition-all ${tempFilter === "warm" ? "ring-2 ring-amber-400" : ""}`} onClick={() => { setTempFilter("warm"); setActiveFilter("all"); }}>
            <p className="text-2xl font-bold text-amber-600">{stats.warm}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">🟡 Warm Lead</p>
              <Tooltip text="Customer is interested but not ready yet" position="bottom" showIcon iconSize={12} />
            </div>
          </Card>
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-emerald-200 transition-all ${activeFilter === "qualified" ? "ring-2 ring-emerald-400" : ""}`} onClick={() => { setActiveFilter("qualified"); setTempFilter("all"); }}>
            <p className="text-2xl font-bold text-blue-600">{stats.qualified}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">✓ Qualified</p>
              <Tooltip text="Customer meets your target criteria" position="bottom" showIcon iconSize={12} />
            </div>
          </Card>
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-emerald-200 transition-all ${activeFilter === "converted" ? "ring-2 ring-emerald-400" : ""}`} onClick={() => { setActiveFilter("converted"); setTempFilter("all"); }}>
            <p className="text-2xl font-bold text-emerald-600">{stats.converted}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">✅ Converted</p>
              <Tooltip text="Customer became a paying customer" position="bottom" showIcon iconSize={12} />
            </div>
          </Card>
          <Card className={`text-center cursor-pointer hover:ring-2 hover:ring-gray-200 transition-all ${activeFilter === "contacted" ? "ring-2 ring-gray-400" : ""}`} onClick={() => { setActiveFilter("contacted"); setTempFilter("all"); }}>
            <p className="text-2xl font-bold text-gray-600">{stats.contacted}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-text-muted">📞 Contacted</p>
              <Tooltip text="Business has already contacted the lead" position="bottom" showIcon iconSize={12} />
            </div>
          </Card>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      {stats.total > 0 && (
        <Card className="mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[600px]">
            {(["new", "contacted", "qualified", "converted"] as LeadStatus[]).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 text-center p-3 rounded-lg ${activeFilter === s ? "ring-2 ring-primary" : ""} ${s === "converted" ? "bg-emerald-50" : "bg-gray-50"}`}>
                  <p className="text-lg font-bold">{stats[s]}</p>
                  <p className="text-xs text-text-muted">{statusConfig[s].label}</p>
                </div>
                {i < 3 && <ArrowRight className="w-4 h-4 text-text-muted mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 w-full sm:w-64">
          <Search className="w-4 h-4 text-text-muted" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search leads..." className="bg-transparent text-sm focus:outline-none w-full" />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-3.5 h-3.5 text-text-muted" /></button>}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={leads.length === 0}><Download className="w-3.5 h-3.5" />Export CSV</Button>

        {/* Temperature Filter */}
        <div className="flex gap-1.5 ml-auto">
          {(["all", "hot", "warm", "cold"] as const).map((t) => (
            <button key={t} onClick={() => setTempFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tempFilter === t ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              {t === "all" ? "All" : tempConfig[t].icon + " " + tempConfig[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {(["all", "new", "contacted", "qualified", "converted", "lost"] as const).map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === f ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
            {f === "all" ? `All (${stats.total})` : `${statusConfig[f].label} (${stats[f]})`}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {leads.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-4">
              Customer conversations on WhatsApp will automatically create leads here. Each new message from a customer becomes a trackable lead in your sales pipeline.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setShowAddModal(true)}><UserPlus className="w-4 h-4" /> Add Lead Manually</Button>
              <Button variant="secondary" onClick={() => window.location.assign("/settings")}><Phone className="w-4 h-4" /> Connect WhatsApp</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {leads.map((lead) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => openProfile(lead)}
                className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={lead.name || lead.phone} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{lead.name || "Unknown"}</p>
                      <span className="text-xs">{tempConfig[lead.lead_temperature || "cold"].icon}</span>
                      {lead.score >= 70 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Score: {lead.score}</span>}
                      {lead.score > 0 && lead.score < 70 && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">Score: {lead.score}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                      {lead.message_count > 0 && <span className="text-xs text-text-muted flex items-center gap-1"><MessageSquare className="w-3 h-3" />{lead.message_count} msgs</span>}
                      {lead.last_message_at && <span className="text-xs text-text-muted flex items-center gap-1 hidden md:flex"><Clock className="w-3 h-3" />{timeAgo(lead.last_message_at)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <Badge variant={statusConfig[lead.status].variant}>{statusConfig[lead.status].label}</Badge>
                    {lead.last_activity_at && <p className="text-[10px] text-text-muted mt-1">Active {timeAgo(lead.last_activity_at)}</p>}
                  </div>
                  {lead.estimated_value > 0 && <span className="text-xs font-medium text-emerald-600 hidden lg:block">{formatUSD(lead.estimated_value)}</span>}
                  <ChevronRight className="w-4 h-4 text-text-muted hidden sm:block" />
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer Profile Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedLead(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Customer Profile</h3>
                  <button onClick={() => setSelectedLead(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar name={selectedLead.name || selectedLead.phone} size="lg" />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold">{selectedLead.name || "Unknown"}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={statusConfig[selectedLead.status].variant}>{statusConfig[selectedLead.status].label}</Badge>
                      <span className="text-sm">{tempConfig[selectedLead.lead_temperature || "cold"].icon} {tempConfig[selectedLead.lead_temperature || "cold"].label}</span>
                      {selectedLead.score > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Score: {selectedLead.score}/100</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {(["info", "timeline", "notes"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${profileTab === tab ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
                  >
                    {tab === "info" && "Details"}
                    {tab === "timeline" && `Timeline (${timeline.length})`}
                    {tab === "notes" && `Notes (${notes.length})`}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <>
                    {/* Info Tab */}
                    {profileTab === "info" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Phone</p><p className="text-sm font-medium">{selectedLead.phone}</p></div>
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Email</p><p className="text-sm font-medium">{selectedLead.email || "—"}</p></div>
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Source</p><p className="text-sm font-medium capitalize">{selectedLead.source}</p></div>
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Value</p><p className="text-sm font-medium text-emerald-600">{formatUSDFull(selectedLead.estimated_value || 0)}</p></div>
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Messages</p><p className="text-sm font-medium">{selectedLead.message_count || 0}</p></div>
                          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-text-muted">Created</p><p className="text-sm font-medium">{new Date(selectedLead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                        </div>

                        {/* Status Change */}
                        <div>
                          <p className="text-xs font-medium text-text-muted mb-2">Change Status</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(["new", "contacted", "qualified", "converted", "lost"] as LeadStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateLeadStatus(selectedLead.id, s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedLead.status === s ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}
                              >
                                {statusConfig[s].label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-medium text-text-muted mb-1">Quick Actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            <a href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="secondary" size="sm" className="w-full"><MessageSquare className="w-3.5 h-3.5" />WhatsApp</Button>
                            </a>
                            <a href={`tel:${selectedLead.phone}`}>
                              <Button variant="secondary" size="sm" className="w-full"><Phone className="w-3.5 h-3.5" />Call</Button>
                            </a>
                            <Button variant="secondary" size="sm" className="w-full" onClick={() => { setSelectedLead(null); window.location.assign("/conversations"); }}>
                              <MessageSquare className="w-3.5 h-3.5" />View Chat
                            </Button>
                            <Button variant="secondary" size="sm" className="w-full" onClick={() => { setSelectedLead(null); window.location.assign("/appointments"); }}>
                              <Calendar className="w-3.5 h-3.5" />Book Appt
                            </Button>
                            {selectedLead.status !== "converted" && (
                              <Button size="sm" className="w-full" onClick={() => updateLeadStatus(selectedLead.id, "converted")}>
                                <TrendingUp className="w-3.5 h-3.5" />Convert
                              </Button>
                            )}
                            {selectedLead.status !== "lost" && (
                              <Button variant="danger" size="sm" className="w-full" onClick={() => { setShowLostReason(true); }}>
                                <X className="w-3.5 h-3.5" />Mark Lost
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timeline Tab */}
                    {profileTab === "timeline" && (
                      <div>
                        {timeline.length === 0 ? (
                          <div className="text-center py-8">
                            <Clock className="w-8 h-8 text-text-muted/20 mx-auto mb-2" />
                            <p className="text-sm text-text-muted">No timeline events yet</p>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                            <div className="space-y-4">
                              {timeline.map((event) => (
                                <div key={event.id} className="flex gap-3 relative">
                                  <div className="w-8 h-8 rounded-full bg-white border-2 border-border flex items-center justify-center text-sm z-10 flex-shrink-0">
                                    {timelineIcons[event.event_type] || "📌"}
                                  </div>
                                  <div className="flex-1 pb-1">
                                    <p className="text-sm font-medium capitalize">{event.event_type.replace(/_/g, " ")}</p>
                                    {event.description && <p className="text-xs text-text-muted mt-0.5">{event.description}</p>}
                                    <p className="text-xs text-text-muted/60 mt-1">{timeAgo(event.created_at)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes Tab */}
                    {profileTab === "notes" && (
                      <div>
                        {/* Add Note */}
                        <div className="flex gap-2 mb-4">
                          <input
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                          />
                          <Button size="sm" onClick={addNote} disabled={!newNote.trim() || submitting}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {notes.length === 0 ? (
                          <div className="text-center py-8">
                            <StickyNote className="w-8 h-8 text-text-muted/20 mx-auto mb-2" />
                            <p className="text-sm text-text-muted">No notes yet. Add one above.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div key={note.id} className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                                <p className="text-sm">{note.note}</p>
                                <p className="text-xs text-text-muted mt-2">{timeAgo(note.created_at)} • {note.created_by}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lost Reason Modal */}
      <AnimatePresence>
        {showLostReason && selectedLead && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={() => setShowLostReason(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold mb-3">Why is this lead lost?</h3>
              <div className="space-y-2 mb-4">
                {["Too Expensive", "No Response", "Competitor Chosen", "Not Interested", "Invalid Lead", "Other"].map((reason) => (
                  <button key={reason} onClick={() => setLostReason(reason)} className={`w-full px-4 py-2.5 text-sm rounded-lg border text-left transition-colors ${lostReason === reason ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-gray-50"}`}>
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowLostReason(false)}>Cancel</Button>
                <Button variant="danger" className="flex-1" disabled={!lostReason} onClick={async () => {
                  await fetch("/api/leads", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: selectedLead.id, status: "lost" }),
                  });
                  // Add note with reason
                  await fetch("/api/leads/notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leadId: selectedLead.id, note: `Lost Reason: ${lostReason}` }),
                  });
                  setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, status: "lost" as LeadStatus } : l));
                  setSelectedLead({ ...selectedLead, status: "lost" });
                  setShowLostReason(false);
                  setLostReason("");
                  setSuccessMsg("Lead marked as lost");
                  setTimeout(() => setSuccessMsg(null), 2000);
                }}>
                  Confirm Lost
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Add Lead</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Name *</label>
                  <input name="name" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Phone *</label>
                  <input name="phone" required type="tel" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="+91..." />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Email</label>
                  <input name="email" type="email" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Value ($)</label>
                    <input name="estimated_value" type="number" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Source</label>
                    <select name="source" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all">
                      <option value="manual">Manual</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="website">Website</option>
                      <option value="facebook">Facebook</option>
                      <option value="referral">Referral</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Notes</label>
                  <textarea name="notes" rows={2} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none" placeholder="Any initial notes..." />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {submitting ? "Adding..." : "Add Lead"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
