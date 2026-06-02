"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Target, TrendingUp, Users, Calendar,
  AlertTriangle, ArrowRight, Loader2, Heart, Zap,
  BarChart2, ArrowUpRight, Bot, MessageSquare, Clock
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";
import { formatINR, formatINRFull } from "@/lib/utils";

interface Funnel { totalLeads: number; contacted: number; qualified: number; appointmentsBooked: number; appointmentsCompleted: number; converted: number; conversionRate: number; }
interface AIAttribution { aiGeneratedLeads: number; aiGeneratedLeadsThisMonth: number; aiBookedAppointments: number; aiConversions: number; aiGeneratedRevenue: number; aiMessages: number; aiResponseRate: number; }
interface Monthly { leads: number; appointments: number; revenue: number; appointmentRevenue: number; }
interface HealthFactor { name: string; score: number; max: number; tip: string | null; }
interface MissedAlert { id: string; name: string; phone: string; temperature: string; score: number; hoursSinceLastContact: number; urgency: string; message: string; }
interface KnowledgeGap { field: string; severity: string; }
interface FollowUpStats { totalSent: number; repliedBack: number; converted: number; activeSequences: number; conversionRate: number; }

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [ai, setAi] = useState<AIAttribution | null>(null);
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [healthGrade, setHealthGrade] = useState("");
  const [healthFactors, setHealthFactors] = useState<HealthFactor[]>([]);
  const [alerts, setAlerts] = useState<MissedAlert[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpStats>({ totalSent: 0, repliedBack: 0, converted: 0, activeSequences: 0, conversionRate: 0 });
  const [aiScore, setAiScore] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/revenue").then((r) => r.json()).catch(() => ({})),
      fetch("/api/analytics/health").then((r) => r.json()).catch(() => ({})),
      fetch("/api/analytics/alerts").then((r) => r.json()).catch(() => ({})),
      fetch("/api/analytics/follow-ups").then((r) => r.json()).catch(() => ({})),
      fetch("/api/knowledge/score").then((r) => r.json()).catch(() => ({})),
    ]).then(([revenue, health, alertsData, fuStats, knowledge]) => {
      if (revenue.funnel) setFunnel(revenue.funnel);
      if (revenue.aiAttribution) setAi(revenue.aiAttribution);
      if (revenue.monthly) setMonthly(revenue.monthly);
      if (health.score !== undefined) { setHealthScore(health.score); setHealthGrade(health.grade || ""); setHealthFactors(health.factors || []); }
      if (alertsData.alerts) setAlerts(alertsData.alerts);
      if (alertsData.gaps) setGaps(alertsData.gaps);
      if (fuStats.totalSent !== undefined) setFollowUp(fuStats);
      if (knowledge.score !== undefined) setAiScore(knowledge.score);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Revenue Intelligence" description="Your AI's business impact at a glance" />

      {/* Empty state when no data */}
      {funnel && funnel.totalLeads === 0 && (
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-indigo-50 border-primary/20">
          <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-text-primary">Connect WhatsApp to start tracking revenue</h3>
              <p className="text-sm text-text-muted mt-1">Once connected, AI will automatically capture leads, book appointments, and track conversions. All revenue data appears here.</p>
            </div>
            <a href="/settings">
              <Button><Zap className="w-4 h-4" /> Connect Now</Button>
            </a>
          </div>
        </Card>
      )}

      {/* Hero Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{formatINR(ai?.aiGeneratedRevenue || 0)}</p>
              <p className="text-xs text-emerald-600">AI Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{ai?.aiGeneratedLeads || 0}</p>
              <p className="text-xs text-blue-600">AI Leads</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{ai?.aiBookedAppointments || 0}</p>
              <p className="text-xs text-purple-600">AI Appointments</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{funnel?.conversionRate || 0}%</p>
              <p className="text-xs text-amber-600">Conversion Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Journey Funnel */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold">Customer Journey Funnel</h3>
          </div>
          {funnel && (
            <div className="space-y-3">
              {[
                { label: "Leads Captured", value: funnel.totalLeads, color: "bg-blue-500", icon: "📥" },
                { label: "Contacted by AI", value: funnel.contacted, color: "bg-indigo-500", icon: "💬" },
                { label: "Qualified", value: funnel.qualified, color: "bg-purple-500", icon: "⭐" },
                { label: "Appointment Booked", value: funnel.appointmentsBooked, color: "bg-amber-500", icon: "📅" },
                { label: "Completed Visit", value: funnel.appointmentsCompleted, color: "bg-orange-500", icon: "✅" },
                { label: "Customer Converted", value: funnel.converted, color: "bg-emerald-500", icon: "🎉" },
              ].map((step, i) => {
                const maxVal = funnel.totalLeads || 1;
                const width = Math.max(8, (step.value / maxVal) * 100);
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-sm w-6">{step.icon}</span>
                    <span className="text-xs text-text-muted w-32 flex-shrink-0">{step.label}</span>
                    <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className={`h-full ${step.color} rounded-full`} />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white mix-blend-difference">{step.value}</span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 mt-2 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Lead → Customer</span>
                  <ArrowRight className="w-3 h-3 text-text-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{funnel.conversionRate}%</span>
                  <span className="text-xs text-text-muted">conversion</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Business Health + AI Readiness */}
        <div className="space-y-4">
          {/* Business Health Score */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /><h4 className="text-sm font-bold">Business Health</h4></div>
              <Badge variant={healthScore >= 70 ? "success" : healthScore >= 50 ? "warning" : "danger"}>{healthGrade}</Badge>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={healthScore >= 70 ? "#10b981" : healthScore >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="6" strokeDasharray={`${(healthScore / 100) * 176} 176`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{healthScore}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {healthFactors.map((f) => (
                  <div key={f.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted w-20 truncate">{f.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${f.score / f.max >= 0.7 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${(f.score / f.max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* AI Readiness */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /><h4 className="text-sm font-bold">AI Readiness</h4></div>
              <span className={`text-lg font-bold ${aiScore >= 80 ? "text-emerald-600" : aiScore >= 50 ? "text-amber-600" : "text-red-500"}`}>{aiScore}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
              <div className={`h-2 rounded-full transition-all ${aiScore >= 80 ? "bg-emerald-500" : aiScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${aiScore}%` }} />
            </div>
            {aiScore < 80 && (
              <a href="/knowledge" className="text-xs text-primary font-medium hover:underline">Improve score →</a>
            )}
          </Card>

          {/* Follow-Up Performance */}
          <Card>
            <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-primary" /><h4 className="text-sm font-bold">Follow-Up Performance</h4></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-gray-50 text-center"><p className="text-sm font-bold">{followUp.totalSent}</p><p className="text-[10px] text-text-muted">Sent</p></div>
              <div className="p-2 rounded bg-gray-50 text-center"><p className="text-sm font-bold">{followUp.repliedBack}</p><p className="text-[10px] text-text-muted">Replied</p></div>
              <div className="p-2 rounded bg-gray-50 text-center"><p className="text-sm font-bold">{followUp.converted}</p><p className="text-[10px] text-text-muted">Converted</p></div>
              <div className="p-2 rounded bg-emerald-50 text-center"><p className="text-sm font-bold text-emerald-600">{followUp.conversionRate}%</p><p className="text-[10px] text-text-muted">Rate</p></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Missed Opportunities + AI Impact */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Missed Opportunity Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /><h3 className="text-sm font-bold">Missed Opportunities</h3></div>
            {alerts.length > 0 && <Badge variant="danger">{alerts.length}</Badge>}
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-6"><Zap className="w-8 h-8 text-emerald-300 mx-auto mb-2" /><p className="text-sm text-text-muted">No missed opportunities. Great job!</p></div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border ${a.urgency === "critical" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.name}</span>
                        <span className="text-xs">{a.temperature === "hot" ? "🔥" : "🟡"}</span>
                        {a.score >= 70 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">High Intent</span>}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{a.message}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => window.location.assign("/leads")}><ArrowRight className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
              {alerts.length > 5 && <p className="text-xs text-text-muted text-center pt-1">+{alerts.length - 5} more</p>}
            </div>
          )}
        </Card>

        {/* AI Impact Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-5 h-5 text-primary" /><h3 className="text-sm font-bold">AI Impact Summary</h3></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
              <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-blue-600" /><span className="text-sm">Messages Handled by AI</span></div>
              <span className="text-sm font-bold text-blue-700">{ai?.aiMessages || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /><span className="text-sm">Leads Generated</span></div>
              <span className="text-sm font-bold text-emerald-700">{ai?.aiGeneratedLeadsThisMonth || 0} <span className="text-xs font-normal text-text-muted">this month</span></span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-600" /><span className="text-sm">Appointments Booked</span></div>
              <span className="text-sm font-bold text-purple-700">{ai?.aiBookedAppointments || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50">
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-600" /><span className="text-sm">Response Rate</span></div>
              <span className="text-sm font-bold text-amber-700">{ai?.aiResponseRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-100/50 border border-emerald-200">
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-700" /><span className="text-sm font-medium">Revenue Attributed to AI</span></div>
              <span className="text-lg font-bold text-emerald-700">{formatINRFull(ai?.aiGeneratedRevenue || 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <Card className="bg-amber-50/30 border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-amber-600" /><h4 className="text-sm font-bold text-amber-900">Knowledge Gaps Hurting Revenue</h4></div>
            <Badge variant="warning">{gaps.length} gaps</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {gaps.map((g, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${g.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                ⚠ {g.field} {g.severity === "high" ? "Missing" : "Incomplete"}
              </span>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => window.location.assign("/knowledge")}>
            <ArrowUpRight className="w-3.5 h-3.5" /> Fix in Knowledge Base
          </Button>
        </Card>
      )}

      {/* ROI Summary */}
      <Card className="mt-6 bg-gradient-to-r from-primary/5 to-indigo-50 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-text-primary">Your AI ROI This Month</h4>
            <p className="text-xs text-text-muted mt-1">
              {ai?.aiGeneratedLeads || 0} leads captured • {ai?.aiBookedAppointments || 0} appointments booked • {ai?.aiConversions || 0} conversions
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{formatINR(monthly?.revenue || 0)}</p>
            <p className="text-xs text-text-muted">total revenue</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
