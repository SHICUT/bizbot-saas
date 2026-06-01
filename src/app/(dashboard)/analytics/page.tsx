"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Target,
  AlertTriangle, ArrowRight, Loader2, Heart, Zap,
  BarChart2, ArrowUpRight
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";

interface Funnel { totalLeads: number; contacted: number; qualified: number; appointmentsBooked: number; appointmentsCompleted: number; converted: number; conversionRate: number; }
interface AIAttribution { aiGeneratedLeads: number; aiGeneratedLeadsThisMonth: number; aiBookedAppointments: number; aiConversions: number; aiGeneratedRevenue: number; aiMessages: number; aiResponseRate: number; }
interface HealthFactor { name: string; score: number; max: number; tip: string | null; }
interface MissedAlert { id: string; name: string; phone: string; temperature: string; score: number; hoursSinceLastContact: number; urgency: string; message: string; }
interface KnowledgeGap { field: string; severity: string; }

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [aiAttribution, setAiAttribution] = useState<AIAttribution | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [healthGrade, setHealthGrade] = useState("");
  const [healthFactors, setHealthFactors] = useState<HealthFactor[]>([]);
  const [alerts, setAlerts] = useState<MissedAlert[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/revenue").then((r) => r.json()).catch(() => ({})),
      fetch("/api/analytics/health").then((r) => r.json()).catch(() => ({})),
      fetch("/api/analytics/alerts").then((r) => r.json()).catch(() => ({})),
    ]).then(([revenue, health, alertsData]) => {
      if (revenue.funnel) setFunnel(revenue.funnel);
      if (revenue.aiAttribution) setAiAttribution(revenue.aiAttribution);
      if (health.score !== undefined) {
        setHealthScore(health.score);
        setHealthGrade(health.grade || "");
        setHealthFactors(health.factors || []);
      }
      if (alertsData.alerts) setAlerts(alertsData.alerts);
      if (alertsData.gaps) setGaps(alertsData.gaps);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Analytics" description="AI performance, revenue & business health" />

      {/* Business Health Score */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold">Business Health Score</h3>
              <p className="text-xs text-text-muted">Overall performance rating</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${healthScore >= 70 ? "text-emerald-600" : healthScore >= 50 ? "text-amber-600" : "text-red-500"}`}>{healthScore}<span className="text-lg">/100</span></p>
            <Badge variant={healthScore >= 70 ? "success" : healthScore >= 50 ? "warning" : "danger"}>{healthGrade}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {healthFactors.map((f) => (
            <div key={f.name} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-muted">{f.name}</span>
                <span className="text-xs font-bold">{f.score}/{f.max}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div className={`h-1.5 rounded-full ${f.score / f.max >= 0.7 ? "bg-emerald-500" : f.score / f.max >= 0.4 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${(f.score / f.max) * 100}%` }} />
              </div>
              {f.tip && <p className="text-[10px] text-text-muted mt-1">{f.tip}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* AI Revenue Attribution */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="text-sm font-bold">AI Revenue Attribution</h3>
              <p className="text-xs text-text-muted">Revenue generated by AI</p>
            </div>
          </div>
          {aiAttribution && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/50">
                <p className="text-xs text-text-muted">AI Revenue</p>
                <p className="text-xl font-bold text-emerald-600">₹{(aiAttribution.aiGeneratedRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50/50">
                <p className="text-xs text-text-muted">AI Leads</p>
                <p className="text-xl font-bold text-blue-600">{aiAttribution.aiGeneratedLeads}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50/50">
                <p className="text-xs text-text-muted">AI Appointments</p>
                <p className="text-xl font-bold text-purple-600">{aiAttribution.aiBookedAppointments}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/50">
                <p className="text-xs text-text-muted">AI Conversions</p>
                <p className="text-xl font-bold text-amber-600">{aiAttribution.aiConversions}</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50/50 col-span-2">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-text-muted">AI Messages Sent</p><p className="text-lg font-bold text-indigo-600">{aiAttribution.aiMessages}</p></div>
                  <div className="text-right"><p className="text-xs text-text-muted">Response Rate</p><p className="text-lg font-bold text-indigo-600">{aiAttribution.aiResponseRate}%</p></div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
            <div>
              <h3 className="text-sm font-bold">Conversion Funnel</h3>
              <p className="text-xs text-text-muted">Lead → Appointment → Customer</p>
            </div>
          </div>
          {funnel && (
            <div className="space-y-3">
              {[
                { label: "Total Leads", value: funnel.totalLeads, color: "bg-blue-500" },
                { label: "Contacted", value: funnel.contacted, color: "bg-indigo-500" },
                { label: "Qualified", value: funnel.qualified, color: "bg-purple-500" },
                { label: "Appointments", value: funnel.appointmentsBooked, color: "bg-amber-500" },
                { label: "Completed", value: funnel.appointmentsCompleted, color: "bg-orange-500" },
                { label: "Converted", value: funnel.converted, color: "bg-emerald-500" },
              ].map((step, i) => {
                const maxVal = funnel.totalLeads || 1;
                const width = Math.max(10, (step.value / maxVal) * 100);
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-24">{step.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className={`h-full ${step.color} rounded-full`}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">{step.value}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-muted">Conversion Rate</span>
                <span className="text-lg font-bold text-emerald-600">{funnel.conversionRate}%</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Missed Lead Alerts + Knowledge Gaps */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Missed Lead Alerts */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
            <div>
              <h3 className="text-sm font-bold">Missed Lead Alerts</h3>
              <p className="text-xs text-text-muted">Hot leads waiting for response</p>
            </div>
            {alerts.length > 0 && <Badge variant="danger" className="ml-auto">{alerts.length}</Badge>}
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-6">
              <Zap className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-text-muted">All caught up! No missed leads.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${alert.urgency === "critical" ? "border-red-200 bg-red-50/50" : alert.urgency === "high" ? "border-amber-200 bg-amber-50/50" : "border-border bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{alert.name}</span>
                        <span className="text-xs">{alert.temperature === "hot" ? "🔥" : "🟡"}</span>
                      </div>
                      <p className="text-xs text-text-muted">{alert.message}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => window.location.assign("/leads")}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Knowledge Gaps */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><BarChart2 className="w-5 h-5 text-amber-600" /></div>
            <div>
              <h3 className="text-sm font-bold">Knowledge Gaps</h3>
              <p className="text-xs text-text-muted">Missing info that hurts AI accuracy</p>
            </div>
          </div>
          {gaps.length === 0 ? (
            <div className="text-center py-6">
              <Zap className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-text-muted">Knowledge base is complete!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gaps.map((gap, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${gap.severity === "high" ? "bg-red-500" : gap.severity === "medium" ? "bg-amber-500" : "bg-gray-400"}`} />
                    <span className="text-sm">{gap.field}</span>
                  </div>
                  <Badge variant={gap.severity === "high" ? "danger" : gap.severity === "medium" ? "warning" : "default"}>
                    {gap.severity === "high" ? "Missing" : gap.severity === "medium" ? "Incomplete" : "Optional"}
                  </Badge>
                </div>
              ))}
              <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => window.location.assign("/knowledge")}>
                <ArrowUpRight className="w-3.5 h-3.5" /> Fix in Knowledge Base
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
