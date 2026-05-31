"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, Clock, User, X, ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  name: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  phone?: string;
  price?: number;
  source?: string;
}

const statusConfig: Record<AppointmentStatus, { label: string; variant: "success" | "warning" | "default" | "danger" | "info"; icon: typeof CheckCircle }> = {
  confirmed: { label: "Confirmed", variant: "success", icon: CheckCircle },
  pending: { label: "Pending", variant: "warning", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "danger", icon: XCircle },
  no_show: { label: "No Show", variant: "danger", icon: AlertCircle },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const filtered = statusFilter === "all" ? appointments : appointments.filter((a) => a.status === statusFilter);
  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    pending: appointments.filter((a) => a.status === "pending").length,
    revenue: appointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.price || 0), 0),
  };

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const apt: Appointment = {
      id: Date.now().toString(),
      name: fd.get("name") as string,
      service: fd.get("service") as string,
      date: fd.get("date") as string,
      time: fd.get("time") as string,
      phone: fd.get("phone") as string,
      price: Number(fd.get("price")) || 0,
      status: "pending",
      source: "manual",
    };
    setAppointments((prev) => [apt, ...prev]);
    setShowAddModal(false);
    setSuccessMsg("Appointment created!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function updateStatus(id: string, status: AppointmentStatus) {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  }

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  return (
    <div>
      <PageHeader title="Appointments" description="Manage bookings and schedule" actionLabel="New Appointment" actionIcon={Plus} onAction={() => setShowAddModal(true)} />

      {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{successMsg}</motion.div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-text-muted">Total</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xl font-bold">{stats.confirmed}</p><p className="text-xs text-text-muted">Confirmed</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold">{stats.pending}</p><p className="text-xs text-text-muted">Pending</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><span className="text-sm font-bold text-indigo-600">₹</span></div><div><p className="text-xl font-bold">₹{stats.revenue.toLocaleString()}</p><p className="text-xs text-text-muted">Revenue</p></div></div></Card>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "list" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}>List</button>
          <button onClick={() => setView("calendar")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "calendar" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}>Calendar</button>
        </div>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarDate(new Date(calYear, calMonth - 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="text-sm font-bold">{calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
            <button onClick={() => setCalendarDate(new Date(calYear, calMonth + 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-text-muted py-2">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayApts = appointments.filter((a) => a.date === dateStr);
              const isToday = new Date().toISOString().split("T")[0] === dateStr;
              return (
                <div key={day} className={`p-1.5 rounded-lg text-center min-h-[40px] ${isToday ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-gray-50"}`}>
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-text-secondary"}`}>{day}</span>
                  {dayApts.length > 0 && <div className="mt-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" /></div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* List View */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Calendar className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No appointments yet</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto mb-4">Appointments appear here when customers book through WhatsApp or when you create them manually.</p>
            <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" /> Create Appointment</Button>
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
                    <Avatar name={apt.name} />
                    <div>
                      <p className="text-sm font-medium">{apt.name}</p>
                      <p className="text-xs text-text-muted">{apt.service}{apt.price ? ` • ₹${apt.price}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{apt.date}</p>
                      <p className="text-xs text-text-muted">{apt.time}</p>
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    {apt.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(apt.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Confirm"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(apt.id, "cancelled")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Cancel"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )}
                    {apt.status === "confirmed" && (
                      <button onClick={() => updateStatus(apt.id, "completed")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Mark Complete"><CheckCircle className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">New Appointment</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1.5">Customer Name *</label><input name="name" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Service *</label><input name="service" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Haircut, Consultation" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1.5">Date *</label><input name="date" type="date" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Time *</label><input name="time" type="time" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1.5">Phone</label><input name="phone" type="tel" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="+91..." /></div>
                <div><label className="text-sm font-medium block mb-1.5">Price (₹)</label><input name="price" type="number" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="0" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">Create Appointment</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
