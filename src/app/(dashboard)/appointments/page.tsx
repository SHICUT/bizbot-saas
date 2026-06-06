"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Calendar, Clock, X, ChevronLeft, ChevronRight, Loader2,
  CheckCircle, XCircle, AlertCircle, RotateCcw, DollarSign, Phone
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";
import { formatUSDFull } from "@/lib/utils";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled" | "no_show" | "rescheduled";
type CalendarView = "day" | "week" | "month" | "list";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  service_price: number;
  staff_assigned: string | null;
  notes: string | null;
  source: string;
  lead_id: string | null;
  leads?: { name: string; phone: string; email: string | null; lead_temperature: string } | null;
}

interface Stats {
  total: number;
  today: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
}

const statusConfig: Record<AppointmentStatus, { label: string; variant: "success" | "warning" | "default" | "danger" | "info"; icon: typeof CheckCircle }> = {
  confirmed: { label: "Confirmed", variant: "success", icon: CheckCircle },
  pending: { label: "Pending", variant: "warning", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "danger", icon: XCircle },
  no_show: { label: "No Show", variant: "danger", icon: AlertCircle },
  rescheduled: { label: "Rescheduled", variant: "info", icon: RotateCcw },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const month = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/appointments?month=${month}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAppointments(data.appointments || []);
      setStats(data.stats || { total: 0, today: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0 });
    } catch (err) {
      console.error("[Appointments] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [calendarDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const filtered = statusFilter === "all" ? appointments : appointments.filter((a) => a.status === statusFilter);

  async function updateStatus(id: string, status: AppointmentStatus) {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
        setSuccessMsg(`Marked as ${status}`);
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    } catch { /* silent */ }
  }

  async function handleReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!showRescheduleModal) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showRescheduleModal.id,
          appointment_date: fd.get("date"),
          appointment_time: fd.get("time"),
          status: "pending",
        }),
      });
      if (res.ok) {
        setShowRescheduleModal(null);
        setSuccessMsg("Rescheduled!");
        setTimeout(() => setSuccessMsg(null), 2000);
        fetchAppointments();
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: fd.get("name"),
          customer_phone: fd.get("phone") || null,
          service: fd.get("service"),
          appointment_date: fd.get("date"),
          appointment_time: fd.get("time"),
          service_price: Number(fd.get("price")) || 0,
          staff_assigned: fd.get("staff") || null,
          notes: fd.get("notes") || null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setSuccessMsg("Appointment created!");
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchAppointments();
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // Week view helpers
  const weekStart = new Date(calendarDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Day view
  const dayStr = calendarDate.toISOString().split("T")[0];
  const dayAppointments = appointments.filter((a) => a.appointment_date === dayStr);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Appointments" description="Manage bookings & schedule" actionLabel="New Appointment" actionIcon={Plus} onAction={() => setShowAddModal(true)} />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />{successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xl font-bold">{stats.today}</p><p className="text-xs text-text-muted">Today</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xl font-bold">{stats.confirmed}</p><p className="text-xs text-text-muted">Confirmed</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xl font-bold">{stats.pending}</p><p className="text-xs text-text-muted">Pending</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-500" /></div>
            <div><p className="text-xl font-bold">{stats.noShow}</p><p className="text-xs text-text-muted">No Show</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-xl font-bold">{formatUSDFull(stats.revenue)}</p><p className="text-xs text-text-muted">Revenue</p></div>
          </div>
        </Card>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["day", "week", "month", "list"] as CalendarView[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === v ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {(["all", "pending", "confirmed", "completed", "cancelled", "no_show"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              {f === "all" ? "All" : f === "no_show" ? "No Show" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {view !== "list" && (
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => {
            const d = new Date(calendarDate);
            if (view === "day") d.setDate(d.getDate() - 1);
            else if (view === "week") d.setDate(d.getDate() - 7);
            else d.setMonth(d.getMonth() - 1);
            setCalendarDate(d);
          }} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>

          <div className="text-center">
            <h3 className="text-sm font-bold">
              {view === "day" && calendarDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {view === "week" && `${weekDays[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
              {view === "month" && calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </h3>
            <button onClick={() => setCalendarDate(new Date())} className="text-xs text-primary hover:underline mt-0.5">Today</button>
          </div>

          <button onClick={() => {
            const d = new Date(calendarDate);
            if (view === "day") d.setDate(d.getDate() + 1);
            else if (view === "week") d.setDate(d.getDate() + 7);
            else d.setMonth(d.getMonth() + 1);
            setCalendarDate(d);
          }} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <Card padding="none" className="mb-6">
          <div className="divide-y divide-border">
            {HOURS.map((hour) => {
              const hourStr = `${String(hour).padStart(2, "0")}:`;
              const hourApts = dayAppointments.filter((a) => a.appointment_time.startsWith(hourStr));
              return (
                <div key={hour} className="flex min-h-[48px]">
                  <div className="w-16 p-2 text-xs text-text-muted text-right border-r border-border flex-shrink-0">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                  </div>
                  <div className="flex-1 p-2 flex flex-wrap gap-1">
                    {hourApts.map((apt) => (
                      <div key={apt.id} className="px-2 py-1 rounded bg-primary/10 text-xs flex items-center gap-1">
                        <span className="font-medium">{apt.customer_name}</span>
                        <span className="text-text-muted">• {apt.service}</span>
                        <Badge variant={statusConfig[apt.status].variant}>{statusConfig[apt.status].label}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Week View */}
      {view === "week" && (
        <Card padding="none" className="mb-6 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 text-xs text-text-muted" />
              {weekDays.map((d, i) => {
                const ds = d.toISOString().split("T")[0];
                const isToday = ds === todayStr;
                return (
                  <div key={i} className={`p-2 text-center border-l border-border ${isToday ? "bg-primary/5" : ""}`}>
                    <p className="text-xs text-text-muted">{DAYS[d.getDay()]}</p>
                    <p className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</p>
                  </div>
                );
              })}
            </div>
            {/* Time slots */}
            {HOURS.filter((_, i) => i % 2 === 0).map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[48px]">
                <div className="p-1 text-[10px] text-text-muted text-right pr-2">
                  {hour > 12 ? `${hour - 12}PM` : hour === 12 ? "12PM" : `${hour}AM`}
                </div>
                {weekDays.map((d, i) => {
                  const ds = d.toISOString().split("T")[0];
                  const hourStr = `${String(hour).padStart(2, "0")}:`;
                  const hourStr2 = `${String(hour + 1).padStart(2, "0")}:`;
                  const slotApts = appointments.filter((a) => a.appointment_date === ds && (a.appointment_time.startsWith(hourStr) || a.appointment_time.startsWith(hourStr2)));
                  return (
                    <div key={i} className="border-l border-border p-0.5">
                      {slotApts.map((apt) => (
                        <div key={apt.id} className="px-1 py-0.5 rounded bg-primary/10 text-[10px] truncate mb-0.5" title={`${apt.customer_name} - ${apt.service}`}>
                          {apt.appointment_time.slice(0, 5)} {apt.customer_name.split(" ")[0]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Month View */}
      {view === "month" && (
        <Card className="mb-6">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-text-muted py-2">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayApts = appointments.filter((a) => a.appointment_date === dateStr);
              const isToday = todayStr === dateStr;
              return (
                <div
                  key={day}
                  onClick={() => { setCalendarDate(new Date(calYear, calMonth, day)); setView("day"); }}
                  className={`p-1.5 rounded-lg text-center min-h-[50px] cursor-pointer transition-colors ${isToday ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-gray-50"}`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-text-secondary"}`}>{day}</span>
                  {dayApts.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayApts.slice(0, 2).map((apt) => (
                        <div key={apt.id} className="text-[9px] bg-primary/10 text-primary rounded px-1 truncate">{apt.appointment_time.slice(0, 5)} {apt.customer_name.split(" ")[0]}</div>
                      ))}
                      {dayApts.length > 2 && <div className="text-[9px] text-text-muted">+{dayApts.length - 2} more</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {filtered.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <Calendar className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto mb-4">
                  Appointments booked through WhatsApp will appear here automatically.
                  You can also create them manually to track all your customer bookings in one place.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" /> Create Appointment</Button>
                  <Button variant="secondary" onClick={() => window.location.assign("/settings")}><Phone className="w-4 h-4" /> Connect WhatsApp</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-border">
                {filtered.map((apt) => {
                  const cfg = statusConfig[apt.status];
                  return (
                    <div key={apt.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar name={apt.customer_name} />
                        <div>
                          <p className="text-sm font-medium">{apt.customer_name}</p>
                          <p className="text-xs text-text-muted">{apt.service}{apt.service_price ? ` • ${formatUSDFull(apt.service_price)}` : ""}</p>
                          {apt.staff_assigned && <p className="text-xs text-text-muted">Staff: {apt.staff_assigned}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{new Date(apt.appointment_date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                          <p className="text-xs text-text-muted">{apt.appointment_time}</p>
                        </div>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <div className="flex gap-1">
                          {apt.status === "pending" && (
                            <>
                              <button onClick={() => updateStatus(apt.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Confirm"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => updateStatus(apt.id, "cancelled")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Cancel"><XCircle className="w-4 h-4" /></button>
                            </>
                          )}
                          {apt.status === "confirmed" && (
                            <>
                              <button onClick={() => updateStatus(apt.id, "completed")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Complete"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => updateStatus(apt.id, "no_show")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="No Show"><AlertCircle className="w-4 h-4" /></button>
                            </>
                          )}
                          {(apt.status === "pending" || apt.status === "confirmed") && (
                            <button onClick={() => setShowRescheduleModal(apt)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Reschedule"><RotateCcw className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">New Appointment</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><label className="text-sm font-medium block mb-1.5">Customer Name *</label><input name="name" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Phone</label><input name="phone" type="tel" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="+91..." /></div>
                <div><label className="text-sm font-medium block mb-1.5">Service *</label><input name="service" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Haircut, Consultation" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium block mb-1.5">Date *</label><input name="date" type="date" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                  <div><label className="text-sm font-medium block mb-1.5">Time *</label><input name="time" type="time" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium block mb-1.5">Price ($)</label><input name="price" type="number" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="0" /></div>
                  <div><label className="text-sm font-medium block mb-1.5">Staff</label><input name="staff" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Assigned to" /></div>
                </div>
                <div><label className="text-sm font-medium block mb-1.5">Notes</label><textarea name="notes" rows={2} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none" /></div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{submitting ? "Creating..." : "Create"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowRescheduleModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Reschedule</h3>
                <button onClick={() => setShowRescheduleModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4">Reschedule appointment for <span className="font-medium text-text-primary">{showRescheduleModal.customer_name}</span></p>
              <form onSubmit={handleReschedule} className="space-y-4">
                <div><label className="text-sm font-medium block mb-1.5">New Date *</label><input name="date" type="date" required defaultValue={showRescheduleModal.appointment_date} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                <div><label className="text-sm font-medium block mb-1.5">New Time *</label><input name="time" type="time" required defaultValue={showRescheduleModal.appointment_time} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Saving..." : "Reschedule"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowRescheduleModal(null)}>Cancel</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
