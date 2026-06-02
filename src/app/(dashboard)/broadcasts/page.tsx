"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, Loader2, CheckCircle, Clock, Eye,
  MessageSquare, Trash2, X, Megaphone, Calendar, AlertCircle
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
  created_at: string;
}

interface Audiences { all: number; leads: number; hot_leads: number; converted: number; engaged: number; }

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
  { name: "Festival Offer", emoji: "🎉", message: "Hi {name}! 🎉\n\nWishing you a Happy Festival! 🪔\n\nSpecial offer just for you:\n🎁 [Offer details]\n\nValid till [Date]. Book now!\n\nReply 'BOOK' to avail." },
  { name: "Discount Offer", emoji: "💰", message: "Hi {name}! 👋\n\nExciting news! We have a special discount for you:\n\n💰 [X]% OFF on [Service/Plan]\n\nLimited time only. Don't miss out!\n\nReply 'YES' to know more." },
  { name: "New Launch", emoji: "🚀", message: "Hi {name}! 🚀\n\nWe just launched something new:\n\n✨ [New Service/Product]\n\n[Brief description]\n\nWant to be among the first to try it?\n\nReply 'INTERESTED' to learn more!" },
  { name: "Membership Renewal", emoji: "🔄", message: "Hi {name}! 👋\n\nYour membership is due for renewal.\n\n🔄 Renew now and get [benefit]!\n\nCurrent plan: [Plan]\nRenewal price: ₹[Price]\n\nReply 'RENEW' or visit us today!" },
  { name: "Follow-up", emoji: "👋", message: "Hi {name}! 👋\n\nWe noticed you haven't visited in a while.\n\nWe miss you! Here's a special welcome-back offer:\n🎁 [Offer]\n\nReply 'BOOK' to schedule your visit!" },
];

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [audiences, setAudiences] = useState<Audiences>({ all: 0, leads: 0, hot_leads: 0, converted: 0, engaged: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(action: "draft" | "send_now" | "schedule") {
    if (!campaignName.trim() || !campaignMessage.trim()) {
      setErrorMsg("Campaign name and message are required");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setSending(true);
    setErrorMsg(null);

    const payload: Record<string, unknown> = {
      name: campaignName,
      message: campaignMessage,
      target_audience: targetAudience,
      action,
    };
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
        setTimeout(() => setErrorMsg(null), 4000);
      } else {
        setCampaigns((prev) => [data.campaign, ...prev]);
        setShowCreate(false);
        resetForm();
        setSuccessMsg(action === "send_now" ? "Campaign sending!" : action === "schedule" ? "Campaign scheduled!" : "Draft saved!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setErrorMsg("Something went wrong");
      setTimeout(() => setErrorMsg(null), 3000);
    }
    setSending(false);
  }

  async function deleteCampaign(id: string) {
    try {
      await fetch("/api/broadcasts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch { /* silent */ }
  }

  function resetForm() {
    setCampaignName("");
    setCampaignMessage("");
    setTargetAudience("all");
    setScheduleDate("");
    setScheduleTime("");
  }

  function useTemplate(template: typeof templates[0]) {
    setCampaignMessage(template.message);
    if (!campaignName) setCampaignName(template.name);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Broadcasts" description="Send promotional messages to your customers" actionLabel="New Campaign" actionIcon={Plus} onAction={() => setShowCreate(true)} />

      <AnimatePresence>
        {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{successMsg}</motion.div>}
        {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorMsg}</motion.div>}
      </AnimatePresence>

      {/* Audience Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {Object.entries(audiences).map(([key, count]) => (
          <Card key={key} className="text-center">
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs text-text-muted mt-0.5">{audienceLabels[key] || key}</p>
          </Card>
        ))}
      </div>

      {/* WhatsApp Compliance Notice */}
      <Card className="mb-6 bg-amber-50/50 border-amber-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">WhatsApp Broadcast Rules</h4>
            <p className="text-xs text-amber-700 mt-1">
              Messages are sent only to customers who have messaged you first (24h window) or via approved templates. Respect WhatsApp&apos;s messaging policies to avoid account restrictions. Use {"{name}"} to personalize messages.
            </p>
          </div>
        </div>
      </Card>

      {/* Campaigns List */}
      {campaigns.length === 0 && !showCreate ? (
        <Card>
          <div className="py-16 text-center">
            <Megaphone className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No campaigns yet</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto mb-4">
              Create your first broadcast campaign to send promotional messages to your customers.
            </p>
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Campaign</Button>
          </div>
        </Card>
      ) : (
        <>
          {campaigns.length > 0 && (
            <Card padding="none" className="mb-6">
              <div className="divide-y divide-border">
                {campaigns.map((c) => {
                  const cfg = statusConfig[c.status] || statusConfig.draft;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-text-muted mt-0.5 truncate max-w-[300px]">{c.message.substring(0, 60)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {c.status === "sent" && (
                          <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" />{c.sent_count}</span>
                            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{c.delivered_count}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{c.read_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{c.replied_count}</span>
                          </div>
                        )}
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowCreate(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-bold">Create Campaign</h3>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Campaign Name */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">Campaign Name *</label>
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Diwali Special Offer" />
                </div>

                {/* Templates */}
                <div>
                  <label className="text-sm font-medium block mb-2">Quick Templates</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <button key={t.name} onClick={() => useTemplate(t)} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors">
                        {t.emoji} {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium block mb-1.5">Message *</label>
                  <textarea
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                    placeholder="Type your message... Use {name} to personalize."
                  />
                  <p className="text-xs text-text-muted mt-1">{campaignMessage.length} characters • Use {"{name}"} for personalization</p>
                </div>

                {/* Audience */}
                <div>
                  <label className="text-sm font-medium block mb-2">Target Audience</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(audiences).map(([key, count]) => (
                      <button
                        key={key}
                        onClick={() => setTargetAudience(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${targetAudience === key ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}
                      >
                        <p className="text-sm font-medium">{audienceLabels[key]}</p>
                        <p className="text-xs text-text-muted mt-0.5">{count} contacts</p>
                      </button>
                    ))}
                  </div>
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
              <div className="flex items-center gap-3 p-6 border-t border-border bg-gray-50 rounded-b-2xl">
                <Button variant="secondary" onClick={() => handleCreate("draft")} disabled={sending}>
                  <Clock className="w-4 h-4" /> Save Draft
                </Button>
                {scheduleDate && scheduleTime && (
                  <Button variant="secondary" onClick={() => handleCreate("schedule")} disabled={sending}>
                    <Calendar className="w-4 h-4" /> Schedule
                  </Button>
                )}
                <Button onClick={() => handleCreate("send_now")} disabled={sending} className="ml-auto">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending..." : `Send Now (${audiences[targetAudience as keyof Audiences] || 0} contacts)`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
