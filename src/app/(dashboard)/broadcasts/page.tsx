"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, Loader2, CheckCircle, Clock, Eye,
  MessageSquare, Trash2, X, Megaphone, Calendar, AlertCircle,
  Info, Shield, Smartphone, BarChart2, Users
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface Campaign {
  id: string;
  name: string;
  message: string;
  target_audience: string;
  status: string;
  scheduled_at: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count?: number;
  outside_window_count?: number;
  created_at: string;
}

interface Audiences { all: number; leads: number; hot_leads: number; converted: number; engaged: number; }
interface Safety { optedOutCount: number; inWindowCount: number; totalEligible: number; healthScore: number; sentToday: number; remainingToday: number; dailyLimit: number; }
interface PreviewData { totalRecipients: number; inWindowCount: number; outsideWindowCount: number; optedOutCount: number; riskScore: number; riskLevel: string; }

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "default" | "info" | "danger" }> = {
  draft: { label: "Draft", variant: "default" },
  scheduled: { label: "Scheduled", variant: "info" },
  sending: { label: "Sending...", variant: "warning" },
  sent: { label: "Sent", variant: "success" },
};

const audienceLabels: Record<string, string> = {
  all: "All Customers",
  leads: "Active Leads",
  hot_leads: "Hot Leads 🔥",
  converted: "Converted Customers",
  engaged: "Engaged Contacts",
};

const templates = [
  { name: "Festival Offer", emoji: "🎉", message: "Hi {name}! 🎉\n\nWishing you a Happy Festival!\n\nSpecial offer just for you:\n🎁 [Offer details]\n\nValid till [Date]. Reply 'BOOK' to avail." },
  { name: "Discount Offer", emoji: "💰", message: "Hi {name}! 👋\n\n💰 [X]% OFF on [Service/Plan]\n\nLimited time only! Reply 'YES' to know more." },
  { name: "New Launch", emoji: "🚀", message: "Hi {name}! 🚀\n\nWe just launched: ✨ [New Service/Product]\n\nReply 'INTERESTED' to learn more!" },
  { name: "Membership Renewal", emoji: "🔄", message: "Hi {name}! 👋\n\nYour membership is due for renewal.\n\n🔄 Renew now and get [benefit]!\n\nReply 'RENEW' or visit us today!" },
  { name: "Follow-up", emoji: "👋", message: "Hi {name}! 👋\n\nWe miss you! Here's a welcome-back offer:\n🎁 [Offer]\n\nReply 'BOOK' to schedule your visit!" },
];

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [audiences, setAudiences] = useState<Audiences>({ all: 0, leads: 0, hot_leads: 0, converted: 0, engaged: 0 });
  const [safety, setSafety] = useState<Safety>({ optedOutCount: 0, inWindowCount: 0, totalEligible: 0, healthScore: 0, sentToday: 0, remainingToday: 250, dailyLimit: 250 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    fetch("/api/broadcasts")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        if (data.audiences) setAudiences(data.audiences);
        if (data.safety) setSafety(data.safety);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadPreview() {
    if (!campaignMessage.trim()) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName || "Preview", message: campaignMessage, target_audience: targetAudience, action: "preview" }),
      });
      if (res.ok) { const d = await res.json(); setPreview(d); }
    } catch { /* silent */ }
    setPreviewLoading(false);
  }

  async function handleTestSend() {
    if (!testNumber.trim() && !campaignMessage.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName || "Test", message: campaignMessage, target_audience: targetAudience, action: "test_send", test_number: testNumber }),
      });
      const data = await res.json();
      setTestResult(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    } catch { setTestResult("✗ Test send failed"); }
    setTestSending(false);
  }

  async function handleCreate(action: "draft" | "send_now" | "schedule") {
    if (!campaignName.trim() || !campaignMessage.trim()) {
      setErrorMsg("Campaign name and message are required");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    // Load preview before showing confirm modal for send_now
    if (action === "send_now") {
      await loadPreview();
      setShowConfirmModal(true);
      return;
    }

    await executeSend(action);
  }

  async function executeSend(action: "draft" | "send_now" | "schedule") {
    setSending(true);
    setErrorMsg(null);
    setShowConfirmModal(false);

    const payload: Record<string, unknown> = { name: campaignName, message: campaignMessage, target_audience: targetAudience, action };
    if (action === "schedule" && scheduleDate && scheduleTime) {
      payload.scheduled_at = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create campaign");
        setTimeout(() => setErrorMsg(null), 5000);
      } else {
        setCampaigns((prev) => [data.campaign, ...prev]);
        setShowCreate(false);
        resetForm();
        setSuccessMsg(action === "send_now" ? "Campaign sending! You'll see stats below." : action === "schedule" ? "Campaign scheduled!" : "Draft saved!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
    setSending(false);
  }

  async function deleteCampaign(id: string) {
    try {
      await fetch("/api/broadcasts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch { /* silent */ }
  }

  function resetForm() {
    setCampaignName(""); setCampaignMessage(""); setTargetAudience("all");
    setScheduleDate(""); setScheduleTime(""); setPreview(null); setTestResult(null);
  }

  function useTemplate(template: typeof templates[0]) {
    setCampaignMessage(template.message);
    if (!campaignName) setCampaignName(template.name);
    setPreview(null);
  }

  const selectedAudienceCount = audiences[targetAudience as keyof Audiences] || 0;
  const isOverLimit = selectedAudienceCount > safety.remainingToday;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Broadcasts" description="Send promotional messages to your customers" actionLabel="New Campaign" actionIcon={Plus} onAction={() => setShowCreate(true)} />

      <AnimatePresence>
        {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{successMsg}</motion.div>}
        {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorMsg}</motion.div>}
      </AnimatePresence>

      {/* Account Health + Daily Limit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className={`${safety.healthScore >= 70 ? "border-emerald-200 bg-emerald-50/30" : safety.healthScore >= 40 ? "border-amber-200 bg-amber-50/30" : "border-red-200 bg-red-50/30"}`}>
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-text-muted">Account Health</p><p className={`text-xl font-bold ${safety.healthScore >= 70 ? "text-emerald-600" : safety.healthScore >= 40 ? "text-amber-600" : "text-red-600"}`}>{safety.healthScore}%</p></div>
            <Shield className={`w-6 h-6 ${safety.healthScore >= 70 ? "text-emerald-400" : safety.healthScore >= 40 ? "text-amber-400" : "text-red-400"}`} />
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${safety.healthScore >= 70 ? "bg-emerald-500" : safety.healthScore >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${safety.healthScore}%` }} /></div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-text-muted">Messages Today</p><p className="text-xl font-bold">{safety.sentToday} <span className="text-sm font-normal text-text-muted">/ {safety.dailyLimit}</span></p></div>
            <BarChart2 className="w-6 h-6 text-primary/40" />
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${safety.sentToday / safety.dailyLimit > 0.8 ? "bg-red-500" : "bg-primary"}`} style={{ width: `${Math.min(100, (safety.sentToday / safety.dailyLimit) * 100)}%` }} /></div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-text-muted">Opted-Out Contacts</p><p className="text-xl font-bold">{safety.optedOutCount}</p></div>
            <Users className="w-6 h-6 text-text-muted/30" />
          </div>
          <p className="text-xs text-text-muted mt-1">Auto-excluded from all broadcasts</p>
        </Card>
      </div>

      {/* Audience Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {Object.entries(audiences).map(([key, count]) => (
          <Card key={key} className="text-center">
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs text-text-muted mt-0.5">{audienceLabels[key] || key}</p>
          </Card>
        ))}
      </div>

      {/* Compact Compliance Bar */}
      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-gray-50 border border-border text-xs text-text-muted">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>WhatsApp Broadcasts follow Meta messaging policies.</span>
        <button onClick={() => setShowPolicyModal(true)} className="ml-auto text-primary font-medium hover:underline whitespace-nowrap">Learn More</button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Megaphone className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-4">Send promotions, announcements, and offers to your customers via WhatsApp. Campaigns are sent safely with daily limits to protect your number.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Campaign</Button>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="mb-6">
          <div className="divide-y divide-border">
            {campaigns.map((c) => {
              const cfg = statusConfig[c.status] || statusConfig.draft;
              const responseRate = c.sent_count > 0 ? Math.round((c.replied_count / c.sent_count) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Megaphone className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-text-muted capitalize">{audienceLabels[c.target_audience] || c.target_audience}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.status === "sent" && (
                      <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                        <span title="Sent" className="flex items-center gap-1"><Send className="w-3 h-3" />{c.sent_count}</span>
                        <span title="Delivered" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{c.delivered_count}</span>
                        <span title="Read" className="flex items-center gap-1"><Eye className="w-3 h-3" />{c.read_count}</span>
                        <span title="Replied" className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{c.replied_count}</span>
                        {(c.failed_count || 0) > 0 && <span title="Failed" className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" />{c.failed_count}</span>}
                        {responseRate > 0 && <span className="text-emerald-600 font-medium">{responseRate}%</span>}
                      </div>
                    )}
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Policy Modal ── */}
      <AnimatePresence>
        {showPolicyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowPolicyModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold">WhatsApp Broadcast Policies</h3><button onClick={() => setShowPolicyModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-text-muted" /></button></div>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>Messages are sent to customers who messaged your business in the last 24 hours.</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>Contacts who reply STOP, UNSUBSCRIBE, or NO are automatically excluded from future broadcasts.</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>Use <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{"{name}"}</code> to personalize messages.</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>Daily limit: 250 messages/day to protect your account health score.</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">⚠</span><span>Contacts outside the 24-hour window should receive approved Meta templates only.</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">⚠</span><span>Sending spam or unsolicited messages can result in account restrictions or bans.</span></div>
              </div>
              <a href="https://business.whatsapp.com/policy" target="_blank" rel="noopener noreferrer" className="block mt-4 text-xs text-primary hover:underline">View Meta&apos;s full messaging policy →</a>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Send Modal ── */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowConfirmModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
                <div><h3 className="text-base font-bold">Confirm Broadcast</h3><p className="text-xs text-text-muted">Review before sending</p></div>
              </div>
              {preview ? (
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between text-sm"><span className="text-text-muted">Recipients</span><span className="font-semibold">{preview.totalRecipients}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-text-muted">In 24h window</span><span className="font-semibold text-emerald-600">{preview.inWindowCount}</span></div>
                  {preview.outsideWindowCount > 0 && <div className="flex justify-between text-sm"><span className="text-text-muted">Outside window</span><span className="font-semibold text-amber-600">{preview.outsideWindowCount}</span></div>}
                  {preview.optedOutCount > 0 && <div className="flex justify-between text-sm"><span className="text-text-muted">Opted-out (excluded)</span><span className="font-semibold text-gray-400">{preview.optedOutCount}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-text-muted">Risk level</span>
                    <span className={`font-semibold ${preview.riskLevel === "high" ? "text-red-600" : preview.riskLevel === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                      {preview.riskLevel === "high" ? "⚠ High" : preview.riskLevel === "medium" ? "⚡ Medium" : "✓ Low"}
                    </span>
                  </div>
                  {isOverLimit && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">Daily limit reached. Only {safety.remainingToday} messages can be sent today.</p>}
                  {preview.riskLevel === "high" && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">Most recipients are outside the 24-hour window. Consider using an approved template to avoid account restrictions.</p>}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => executeSend("send_now")} disabled={sending || !preview}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Now
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Campaign Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-bold">Create Campaign</h3>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">Campaign Name *</label>
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Diwali Special Offer" />
                </div>

                {/* Templates */}
                <div>
                  <label className="text-sm font-medium block mb-2">Quick Templates</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <button key={t.name} onClick={() => useTemplate(t)} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors">{t.emoji} {t.name}</button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">Message *</label>
                  <textarea value={campaignMessage} onChange={(e) => { setCampaignMessage(e.target.value); setPreview(null); }} rows={6} className="w-full px-4 py-3 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none" placeholder="Type your message... Use {name} to personalize." />
                  <p className="text-xs text-text-muted mt-1">{campaignMessage.length} chars • Use {"{name}"} for personalization • STOP/UNSUBSCRIBE replies auto-excluded</p>
                </div>

                {/* Audience */}
                <div>
                  <label className="text-sm font-medium block mb-2">Target Audience</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(audiences).map(([key, count]) => (
                      <button key={key} onClick={() => { setTargetAudience(key); setPreview(null); }} className={`p-3 rounded-lg border text-left transition-all ${targetAudience === key ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                        <p className="text-sm font-medium">{audienceLabels[key]}</p>
                        <p className="text-xs text-text-muted mt-0.5">{count} contacts</p>
                      </button>
                    ))}
                  </div>
                  {isOverLimit && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mt-2">⚠ Selected audience ({selectedAudienceCount}) exceeds today&apos;s remaining limit ({safety.remainingToday}). Campaign will send to first {safety.remainingToday} contacts.</p>}
                </div>

                {/* Test Send */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-blue-600" /><p className="text-sm font-medium text-blue-900">Test Send</p></div>
                  <p className="text-xs text-blue-700 mb-3">Send a test message to your own number before broadcasting to all customers.</p>
                  <div className="flex gap-2">
                    <input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="+91 98765 43210 (leave blank for your profile number)" className="flex-1 px-3 py-2 text-sm rounded-lg border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <Button size="sm" variant="secondary" onClick={handleTestSend} disabled={testSending || !campaignMessage.trim()}>
                      {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      Test
                    </Button>
                  </div>
                  {testResult && <p className={`text-xs mt-2 font-medium ${testResult.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>{testResult}</p>}
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-sm font-medium block mb-2">Schedule (optional)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                    <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center flex-wrap gap-3 p-6 border-t border-border bg-gray-50 rounded-b-2xl">
                <Button variant="secondary" onClick={() => handleCreate("draft")} disabled={sending}><Clock className="w-4 h-4" />Save Draft</Button>
                {scheduleDate && scheduleTime && (
                  <Button variant="secondary" onClick={() => executeSend("schedule")} disabled={sending}><Calendar className="w-4 h-4" />Schedule</Button>
                )}
                <Button onClick={() => handleCreate("send_now")} disabled={sending || !campaignMessage.trim() || !campaignName.trim()} className="ml-auto">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Processing..." : `Send to ${selectedAudienceCount} contacts`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
