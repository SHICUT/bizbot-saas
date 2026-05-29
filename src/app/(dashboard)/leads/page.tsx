"use client";

import { useState, useEffect } from "react";
import { UserPlus, Filter, Download, Search, X, Loader2, Users } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/layout/PageHeader";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  status: LeadStatus;
  source: string;
  created_at: string;
  last_message_at: string | null;
}

const statusConfig: Record<LeadStatus, { label: string; variant: "info" | "default" | "warning" | "success" | "danger" }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  qualified: { label: "Qualified", variant: "warning" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
};

const filterOptions: Array<"all" | LeadStatus> = ["all", "new", "contacted", "qualified", "converted", "lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | LeadStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      // For now, leads come from the dashboard API or a dedicated endpoint
      // The actual leads will be populated when WhatsApp messages arrive
      setLeads([]);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesFilter = activeFilter === "all" || lead.status === activeFilter;
    const matchesSearch = !searchQuery || (lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || lead.phone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  function handleExport() {
    if (filteredLeads.length === 0) return;
    const csv = ["Name,Phone,Status,Source,Created"].concat(
      filteredLeads.map((l) => `${l.name || ""},${l.phone},${l.status},${l.source},${l.created_at}`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg("Leads exported!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <PageHeader title="Leads" description={`${leads.length} contacts captured`} actionLabel="Add Lead" actionIcon={UserPlus} onAction={() => setShowAddModal(true)} />

      {successMsg && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {successMsg}</div>}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 w-full sm:w-64">
          <Search className="w-4 h-4 text-text-muted" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search leads..." className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setActiveFilter("all")}><Filter className="w-3.5 h-3.5" />{activeFilter !== "all" ? "Clear" : "Filter"}</Button>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={filteredLeads.length === 0}><Download className="w-3.5 h-3.5" />Export</Button>
        <div className="flex gap-2 ml-auto flex-wrap">
          {filterOptions.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeFilter === f ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredLeads.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No leads yet</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              {leads.length === 0
                ? "Leads will appear here automatically when customers message you on WhatsApp or Instagram."
                : "No leads match your current filter."}
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Contact</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Source</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="py-3.5 px-4"><div className="flex items-center gap-3"><Avatar name={lead.name || lead.phone} size="sm" /><div><p className="text-sm font-medium text-text-primary">{lead.name || "Unknown"}</p><p className="text-xs text-text-muted">{lead.phone}</p></div></div></td>
                    <td className="py-3.5 px-4"><Badge variant={statusConfig[lead.status].variant}>{statusConfig[lead.status].label}</Badge></td>
                    <td className="py-3.5 px-4 hidden sm:table-cell"><span className="text-sm text-text-secondary">{lead.source}</span></td>
                    <td className="py-3.5 px-4"><Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lead Details</h3>
              <button onClick={() => setSelectedLead(null)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4"><Avatar name={selectedLead.name || selectedLead.phone} size="lg" /><div><p className="font-semibold">{selectedLead.name || "Unknown"}</p><p className="text-sm text-text-muted">{selectedLead.phone}</p></div></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Status</span><Badge variant={statusConfig[selectedLead.status].variant}>{statusConfig[selectedLead.status].label}</Badge></div>
              <div className="flex justify-between"><span className="text-text-secondary">Source</span><span>{selectedLead.source}</span></div>
            </div>
            <Button className="w-full mt-6" onClick={() => { setSelectedLead(null); window.location.href = "/conversations"; }}>Open Chat</Button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); setSuccessMsg("Lead added!"); setTimeout(() => setSuccessMsg(null), 3000); }} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1.5">Name</label><input required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Customer name" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Phone</label><input required type="tel" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="+91 98765 43210" /></div>
              <div className="flex gap-2"><Button type="submit" className="flex-1">Add Lead</Button><Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
