"use client";

import { useState } from "react";
import { UserPlus, Filter, Download, Search, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/layout/PageHeader";

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  source: string;
  lastActivity: string;
}

const allLeads: Lead[] = [
  { id: "1", name: "Priya Mehta", phone: "+91 98765 43210", status: "new", source: "WhatsApp", lastActivity: "2 min ago" },
  { id: "2", name: "Amit Kumar", phone: "+91 87654 32109", status: "contacted", source: "WhatsApp", lastActivity: "15 min ago" },
  { id: "3", name: "Sneha Patel", phone: "+91 76543 21098", status: "qualified", source: "WhatsApp", lastActivity: "1 hour ago" },
  { id: "4", name: "Rajesh Gupta", phone: "+91 65432 10987", status: "converted", source: "WhatsApp", lastActivity: "2 hours ago" },
  { id: "5", name: "Kavita Singh", phone: "+91 54321 09876", status: "new", source: "WhatsApp", lastActivity: "3 hours ago" },
  { id: "6", name: "Vikram Joshi", phone: "+91 43210 98765", status: "contacted", source: "WhatsApp", lastActivity: "5 hours ago" },
  { id: "7", name: "Neha Sharma", phone: "+91 32109 87654", status: "lost", source: "WhatsApp", lastActivity: "1 day ago" },
  { id: "8", name: "Arjun Reddy", phone: "+91 21098 76543", status: "qualified", source: "WhatsApp", lastActivity: "1 day ago" },
];

const statusConfig: Record<LeadStatus, { label: string; variant: "info" | "default" | "warning" | "success" | "danger" }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  qualified: { label: "Qualified", variant: "warning" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
};

const filterOptions: Array<"all" | LeadStatus> = ["all", "new", "contacted", "qualified", "converted", "lost"];

export default function LeadsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | LeadStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter + search logic
  const filteredLeads = allLeads.filter((lead) => {
    const matchesFilter = activeFilter === "all" || lead.status === activeFilter;
    const matchesSearch =
      !searchQuery ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  function handleExport() {
    const csv = [
      "Name,Phone,Status,Source,Last Activity",
      ...filteredLeads.map((l) => `${l.name},${l.phone},${l.status},${l.source},${l.lastActivity}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg("Leads exported successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${filteredLeads.length} contacts captured from WhatsApp`}
        actionLabel="Add Lead"
        actionIcon={UserPlus}
        onAction={() => setShowAddModal(true)}
      />

      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          ✓ {successMsg}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 w-full sm:w-64">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setActiveFilter("all")}>
          <Filter className="w-3.5 h-3.5" />
          {activeFilter !== "all" ? "Clear Filter" : "Filter"}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>

        {/* Status Tabs */}
        <div className="flex gap-2 ml-auto flex-wrap">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              {filter === "all" ? `All (${allLeads.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)} (${allLeads.filter((l) => l.status === filter).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <Card padding="none">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-muted text-sm">No leads found matching your criteria.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Contact</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Source</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4 hidden md:table-cell">Last Activity</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                          <p className="text-xs text-text-muted">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={statusConfig[lead.status].variant}>{statusConfig[lead.status].label}</Badge>
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell">
                      <span className="text-sm text-text-secondary">{lead.source}</span>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <span className="text-sm text-text-muted">{lead.lastActivity}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Lead Details</h3>
              <button onClick={() => setSelectedLead(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={selectedLead.name} size="lg" />
              <div>
                <p className="font-semibold text-text-primary">{selectedLead.name}</p>
                <p className="text-sm text-text-muted">{selectedLead.phone}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Status</span><Badge variant={statusConfig[selectedLead.status].variant}>{statusConfig[selectedLead.status].label}</Badge></div>
              <div className="flex justify-between"><span className="text-text-secondary">Source</span><span className="text-text-primary">{selectedLead.source}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Last Activity</span><span className="text-text-primary">{selectedLead.lastActivity}</span></div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button className="flex-1" onClick={() => { setSelectedLead(null); window.location.href = "/conversations"; }}>Open Chat</Button>
              <Button variant="secondary" onClick={() => setSelectedLead(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); setSuccessMsg("Lead added successfully!"); setTimeout(() => setSuccessMsg(null), 3000); }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">Name</label>
                <input required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Customer name" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">Phone</label>
                <input required type="tel" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">Source</label>
                <select className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>WhatsApp</option>
                  <option>Manual</option>
                  <option>Referral</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Add Lead</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
