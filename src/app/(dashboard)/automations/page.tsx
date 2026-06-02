"use client";

import { useState, useEffect } from "react";
import { Bot, Clock, Zap, Save, CheckCircle, Sparkles, BookOpen, ArrowRight, MessageSquare, Loader2, Send, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface ScoreSection { name: string; score: number; }

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

  // AI Readiness Score
  const [score, setScore] = useState(0);
  const [scoreSections, setScoreSections] = useState<ScoreSection[]>([]);
  const [scoreLoading, setScoreLoading] = useState(true);

  // Test AI
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Additional Notes
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Follow-up stats
  const [followUpStats, setFollowUpStats] = useState({ totalSent: 0, repliedBack: 0, converted: 0, activeSequences: 0, conversionRate: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/knowledge/score").then((r) => r.json()),
      fetch("/api/analytics/follow-ups").then((r) => r.json()).catch(() => ({})),
    ]).then(([scoreData, fuStats]) => {
      setScore(scoreData.score || 0);
      setScoreSections(scoreData.sections || []);
      if (fuStats.totalSent !== undefined) setFollowUpStats(fuStats);
      setScoreLoading(false);
    }).catch(() => setScoreLoading(false));
  }, []);

  function handleSaveSettings() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg("Settings saved!");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 800);
  }

  function handleToggleAI() {
    setAiEnabled(!aiEnabled);
    setSuccessMsg(aiEnabled ? "AI auto-reply disabled" : "AI auto-reply enabled");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleTestAI() {
    if (!testMessage.trim()) return;
    setTestLoading(true);
    setTestResponse("");
    try {
      const res = await fetch("/api/test/simulate-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResponse(data.reply || data.response || "No response generated.");
      } else {
        setTestResponse("Failed to get AI response. Make sure your knowledge base is set up.");
      }
    } catch {
      setTestResponse("Error connecting to AI. Please try again.");
    }
    setTestLoading(false);
  }

  return (
    <div>
      <PageHeader title="AI Automations" description="Configure how your AI assistant responds to customers" />

      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />{successMsg}
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
              <h3 className="text-base font-semibold text-text-primary">AI Auto-Reply</h3>
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
        {/* Left Column: Knowledge + Test AI */}
        <div className="lg:col-span-2 space-y-6">

          {/* AI Readiness Score */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold text-text-primary">AI Knowledge Score</h3>
                  <p className="text-xs text-text-muted">How well your AI can answer customer questions</p>
                </div>
              </div>
              {!scoreLoading && (
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>{score}%</span>
                  <Badge variant={score >= 80 ? "success" : score >= 50 ? "warning" : "danger"}>
                    {score >= 80 ? "AI Ready" : score >= 50 ? "Partial" : "Needs Setup"}
                  </Badge>
                </div>
              )}
            </div>

            {scoreLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="w-full h-3 bg-gray-100 rounded-full mb-4">
                  <div className={`h-3 rounded-full transition-all duration-700 ${score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                </div>

                {/* Section breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {scoreSections.map((s) => (
                    <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.score === 100 ? "bg-emerald-500" : s.score > 0 ? "bg-amber-400" : "bg-gray-300"}`} />
                      <span className="text-xs text-text-secondary truncate">{s.name}</span>
                      <span className="text-xs font-semibold ml-auto">{s.score === 100 ? "✓" : `${s.score}%`}</span>
                    </div>
                  ))}
                </div>

                {/* CTA to Knowledge Base */}
                <a href="/knowledge" className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Manage Knowledge Base</p>
                      <p className="text-xs text-text-muted">Add services, pricing, FAQs, and business details</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                </a>
              </>
            )}
          </Card>

          {/* Test AI Panel */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Test AI Responses</h3>
                  <p className="text-xs text-text-muted">See exactly what customers will receive</p>
                </div>
              </div>
              <Button size="sm" variant={showTestPanel ? "primary" : "secondary"} onClick={() => setShowTestPanel(!showTestPanel)}>
                {showTestPanel ? "Hide" : "Test AI"}
              </Button>
            </div>

            {showTestPanel && (
              <div className="space-y-4">
                {/* Quick test prompts */}
                <div className="flex flex-wrap gap-2">
                  {["What are your prices?", "Where are you located?", "What are your timings?", "Who is the owner?", "Do you offer a free trial?"].map((q) => (
                    <button key={q} onClick={() => { setTestMessage(q); }} className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleTestAI(); }}
                    placeholder="Type a customer message..."
                    className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button onClick={handleTestAI} disabled={testLoading || !testMessage.trim()}>
                    {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Response */}
                {testResponse && (
                  <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <p className="text-xs font-medium text-emerald-700 mb-1.5">AI Response:</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{testResponse}</p>
                  </div>
                )}

                {!testResponse && !testLoading && (
                  <div className="p-4 rounded-lg bg-gray-50 border border-border text-center">
                    <p className="text-xs text-text-muted">Send a test message to see how your AI responds to customers</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Follow-Up Automation Stats */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-text-primary">Follow-Up Automation</h3>
                <p className="text-xs text-text-muted">Auto re-engages leads who stop replying</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-50/50 text-center">
                <p className="text-lg font-bold text-blue-600">{followUpStats.totalSent}</p>
                <p className="text-[10px] text-text-muted">Sent</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/50 text-center">
                <p className="text-lg font-bold text-emerald-600">{followUpStats.repliedBack}</p>
                <p className="text-[10px] text-text-muted">Replied</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50/50 text-center">
                <p className="text-lg font-bold text-purple-600">{followUpStats.converted}</p>
                <p className="text-[10px] text-text-muted">Converted</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/50 text-center">
                <p className="text-lg font-bold text-amber-600">{followUpStats.conversionRate}%</p>
                <p className="text-[10px] text-text-muted">Rate</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-border">
              <p className="text-xs font-medium text-text-primary mb-2">How it works:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>After 24h: Gentle reminder about their inquiry</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>After 3 days: Share an offer or value proposition</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>After 7 days: Final CTA (book trial/visit)</span>
                </div>
              </div>
              <p className="text-[10px] text-text-muted mt-2">Stops automatically when customer replies. Messages are tailored to your business type.</p>
            </div>
            {followUpStats.activeSequences > 0 && (
              <p className="text-xs text-primary font-medium mt-3">🔄 {followUpStats.activeSequences} active sequence{followUpStats.activeSequences > 1 ? "s" : ""} running</p>
            )}
          </Card>

          {/* Additional Notes (replaces old textarea) */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-4 h-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">Additional Notes</h3>
              <span className="text-xs text-text-muted">(Optional)</span>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Extra context the AI can use as secondary information. Primary knowledge should be in the Knowledge Base.
            </p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-sm rounded-lg border border-border bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Any extra notes for the AI (e.g. current promotions, temporary changes, special instructions)..."
            />
            <p className="text-xs text-text-muted mt-2">{additionalNotes.length} characters</p>
          </Card>
        </div>

        {/* Right Column: Settings */}
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
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Settings"}
              </Button>
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
