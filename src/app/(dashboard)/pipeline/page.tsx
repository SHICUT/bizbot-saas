"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, ChevronRight, Phone, User, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface PipelineStage { id: string; label: string; color: string; icon: string; order: number; }
interface StageSummary { stage: PipelineStage; count: number; value: number; }
interface Lead {
  id: string; name: string | null; phone: string; email: string | null;
  status: string; score: number; lead_temperature: string;
  metadata: Record<string, unknown>; source: string; created_at: string; last_message_at: string;
}

export default function PipelinePage() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [summary, setSummary] = useState<StageSummary[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => { loadPipeline(); }, []);

  async function loadPipeline(stage?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (search) params.set("search", search);
    const res = await fetch(`/api/pipeline?${params}`);
    const data = await res.json();
    setStages(data.stages || []);
    setSummary(data.summary || []);
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function moveLead(leadId: string, newStage: string, reason?: string) {
    setMoving(leadId);
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, stage: newStage, reason }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: `Lead moved to ${stages.find((s) => s.id === newStage)?.label || newStage}` });
      loadPipeline(activeStage || undefined);
    } else {
      setMsg({ type: "error", text: "Failed to move lead" });
    }
    setMoving(null);
    setTimeout(() => setMsg(null), 3000);
  }

  function formatValue(v: number): string {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
    if (v > 0) return `₹${v.toLocaleString("en-IN")}`;
    return "";
  }

  const filteredLeads = activeStage ? leads.filter((l) => l.status === activeStage) : leads;

  if (loading && stages.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Sales Pipeline" description="Track leads through your sales process" />
      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {/* Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
        {summary.map((s) => (
          <button key={s.stage.id} onClick={() => { setActiveStage(activeStage === s.stage.id ? null : s.stage.id); loadPipeline(activeStage === s.stage.id ? undefined : s.stage.id); }}
            className={`p-3 rounded-xl border text-left transition-all ${activeStage === s.stage.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 bg-white"}`}>
            <div className="text-lg mb-1">{s.stage.icon}</div>
            <div className="text-[10px] font-medium text-text-muted truncate">{s.stage.label}</div>
            <div className="text-lg font-bold">{s.count}</div>
            {s.value > 0 && <div className="text-[10px] text-text-muted">{formatValue(s.value)}</div>}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") loadPipeline(activeStage || undefined); }}
            placeholder="Search leads..." className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20" />
        </div>
        {activeStage && <Button variant="secondary" onClick={() => { setActiveStage(null); loadPipeline(); }}>Clear Filter</Button>}
      </div>

      {/* Leads List */}
      <Card padding="none">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 text-text-muted/20 mx-auto mb-2" />
            <p className="text-sm text-text-muted">{activeStage ? "No leads in this stage" : "No leads yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLeads.map((lead) => {
              const currentStage = stages.find((s) => s.id === lead.status);
              const nextStage = stages.find((s) => s.order === (currentStage?.order || 0) + 1);
              const meta = lead.metadata || {};
              return (
                <div key={lead.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{lead.name || lead.phone}</span>
                      <Badge variant={lead.lead_temperature === "hot" ? "danger" : lead.lead_temperature === "warm" ? "warning" : "default"}>
                        {lead.lead_temperature || "cold"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{lead.phone}</span>
                      {meta.budget ? <span>💰 {String(meta.budget)}</span> : null}
                      {meta.location ? <span>📍 {String(meta.location)}</span> : null}
                      <span>{lead.source}</span>
                    </div>
                  </div>
                  {/* Current Stage */}
                  <div className="hidden sm:block text-center px-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100">{currentStage?.icon} {currentStage?.label}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {nextStage && lead.status !== "converted" && lead.status !== "lost" && (
                      <Button size="sm" variant="secondary" disabled={moving === lead.id}
                        onClick={() => moveLead(lead.id, nextStage.id)}>
                        {moving === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                        {nextStage.label}
                      </Button>
                    )}
                    {lead.status !== "lost" && lead.status !== "converted" && (
                      <Button size="sm" variant="ghost"
                        onClick={() => { const r = prompt("Lost reason?"); if (r) moveLead(lead.id, "lost", r); }}>
                        ❌
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
