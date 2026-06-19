"use client";

import { useState, useEffect } from "react";
import { Loader2, Zap, Trash2, RefreshCw, Database, Users, MessageSquare, Calendar, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface DemoStats {
  leads: number;
  conversations: number;
  appointments: number;
  messages: number;
}

export default function AdminDemoPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exists, setExists] = useState(false);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ duration: number } | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    const res = await fetch("/api/admin/demo");
    if (res.ok) {
      const data = await res.json();
      setExists(data.exists);
      setStats(data.stats);
    }
    setLoading(false);
  }

  async function generate() {
    setGenerating(true); setMsg(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55s client timeout
      
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (data.success) {
        setMsg(`✓ Demo generated in ${((data.duration || 0) / 1000).toFixed(1)}s — ${data.stats?.leads} leads, ${data.stats?.messages} messages`);
        setStats(data.stats);
        setExists(true);
      } else {
        setMsg(`✗ ${data.error || "Generation failed"}\n${(data.log || []).join("\n")}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      if (errMsg.includes("abort")) {
        setMsg("✗ Generation timed out (>55s). Check Vercel function logs for details.");
      } else {
        setMsg(`✗ Network error: ${errMsg}`);
      }
    }
    setGenerating(false);
  }

  async function reset() {
    if (!confirm("Reset all demo data? This cannot be undone.")) return;
    setResetting(true); setMsg(null);
    const res = await fetch("/api/admin/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
    if (res.ok) { setMsg("✓ Demo data cleared"); setStats(null); setExists(false); }
    setResetting(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Demo Management" description="Generate realistic demo data for FlowNex" />

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${msg.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg}
        </div>
      )}

      {/* Status */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exists ? "bg-emerald-50" : "bg-gray-100"}`}>
              <Database className={`w-5 h-5 ${exists ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{exists ? "Demo Data Active" : "No Demo Data"}</h3>
              <p className="text-xs text-text-muted">{exists ? "Skyline Realty workspace is populated" : "Click Generate to create demo workspace"}</p>
            </div>
          </div>
          <Badge variant={exists ? "success" : "default"}>{exists ? "Active" : "Empty"}</Badge>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><div className="flex items-center gap-3"><Users className="w-5 h-5 text-blue-500" /><div><p className="text-xl font-bold">{stats.leads}</p><p className="text-xs text-text-muted">Leads</p></div></div></Card>
          <Card><div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-purple-500" /><div><p className="text-xl font-bold">{stats.conversations}</p><p className="text-xs text-text-muted">Conversations</p></div></div></Card>
          <Card><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-emerald-500" /><div><p className="text-xl font-bold">{stats.appointments}</p><p className="text-xs text-text-muted">Appointments</p></div></div></Card>
          <Card><div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-amber-500" /><div><p className="text-xl font-bold">{stats.messages}</p><p className="text-xs text-text-muted">Messages</p></div></div></Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={generate} disabled={generating} className="flex-1">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {generating ? "Generating..." : "Generate Demo Data"}
        </Button>
        {exists && (
          <>
            <Button variant="secondary" onClick={generate} disabled={generating}>
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
            <Button variant="danger" onClick={reset} disabled={resetting}>
              <Trash2 className="w-4 h-4" /> Reset
            </Button>
          </>
        )}
      </div>

      {/* Info */}
      <Card className="mt-6 bg-blue-50/50 border-blue-100">
        <h4 className="text-sm font-bold text-blue-900 mb-2">What Gets Generated</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> 127 leads with full CRM data</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> 186 realistic conversations</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> 38 appointments (calendar)</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> 2,900+ messages</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Knowledge base (Real Estate)</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Subscription (Growth plan)</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Pipeline stages populated</div>
          <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> WhatsApp "connected" state</div>
        </div>
        <p className="text-xs text-blue-600 mt-3">All demo data is isolated (is_demo=true) and never mixes with real customer data.</p>
      </Card>
    </div>
  );
}
