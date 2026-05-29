"use client";

import { useState } from "react";
import { Bot, MessageSquare, Clock, Zap, Save, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";

export default function AutomationsPage() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [replyTone, setReplyTone] = useState("friendly");
  const [replyLanguage, setReplyLanguage] = useState("auto");
  const [pauseDuration, setPauseDuration] = useState("30");
  const [quickActions, setQuickActions] = useState({
    sendPriceList: true,
    offerTrial: true,
    shareLocation: true,
    collectInfo: true,
  });
  const [businessContext, setBusinessContext] = useState(
    `We are FitZone Gym located in Koregaon Park, Pune.

Membership Plans:
- Basic: ₹1,500/month (gym access only)
- Pro: ₹2,500/month (gym + group classes)
- Premium: ₹4,000/month (gym + classes + personal trainer)

Timings: Mon-Sat 6 AM to 10 PM, Sunday 7 AM to 1 PM

Facilities: AC gym, locker rooms, shower, parking, juice bar

Classes: Zumba (6 PM), HIIT (7 PM), Yoga (8 PM)

Free trial class available for new members.
Contact: +91 98765 43210`
  );

  function handleSaveContext() {
    setSaving(true);
    // In production: POST to /api/business with the context
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg("AI context saved successfully! Changes will apply to new conversations.");
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 1000);
  }

  function handleToggleAI() {
    setAiEnabled(!aiEnabled);
    setSuccessMsg(aiEnabled ? "AI auto-reply disabled" : "AI auto-reply enabled");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  return (
    <div>
      <PageHeader
        title="AI Automations"
        description="Configure how your AI assistant responds to customers"
      />

      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* AI Toggle */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${aiEnabled ? "bg-primary/10" : "bg-gray-100"}`}>
              <Bot className={`w-6 h-6 ${aiEnabled ? "text-primary" : "text-gray-400"}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                AI Auto-Reply
              </h3>
              <p className="text-sm text-text-secondary">
                {aiEnabled ? "AI is responding to incoming messages" : "AI is paused — messages won't get auto-replies"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAI}
            className={`relative w-12 h-6 rounded-full transition-colors ${aiEnabled ? "bg-primary" : "bg-gray-300"}`}
            aria-label="Toggle AI"
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${aiEnabled ? "translate-x-6.5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Context */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-primary">Business Context</h3>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Tell the AI about your business. It uses this to answer customer questions accurately.
          </p>
          <textarea
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            rows={14}
            className="w-full px-4 py-3 text-sm rounded-lg border border-border bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
            placeholder="Describe your business: services, prices, timings, location, policies..."
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-text-muted">{businessContext.length} characters</p>
            <Button onClick={handleSaveContext} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Context"}
            </Button>
          </div>
        </Card>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Reply Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary block mb-1.5">Reply Tone</label>
                <select
                  value={replyTone}
                  onChange={(e) => setReplyTone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="friendly">Friendly & Professional</option>
                  <option value="casual">Casual & Warm</option>
                  <option value="formal">Formal & Corporate</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1.5">Reply Language</label>
                <select
                  value={replyLanguage}
                  onChange={(e) => setReplyLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="auto">Auto-detect (recommended)</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="hinglish">Hinglish (Mix)</option>
                </select>
                <p className="text-xs text-text-muted mt-1">Auto-detect mirrors the customer&apos;s language</p>
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1.5">Manual Reply Pause</label>
                <select
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
                <p className="text-xs text-text-muted mt-1">AI pauses after you reply manually</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {([
                { key: "sendPriceList", label: "Send price list when asked" },
                { key: "offerTrial", label: "Offer free trial to new leads" },
                { key: "shareLocation", label: "Share location when asked" },
                { key: "collectInfo", label: "Collect name & email" },
              ] as const).map((action) => (
                <label key={action.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickActions[action.key]}
                    onChange={(e) => setQuickActions({ ...quickActions, [action.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm text-text-secondary">{action.label}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
