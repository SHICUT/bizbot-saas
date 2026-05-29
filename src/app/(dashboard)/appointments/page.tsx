"use client";

import { useState } from "react";
import { Plus, Calendar, Clock, User, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";

interface Appointment {
  id: string;
  name: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
}

const initialAppointments: Appointment[] = [
  { id: "1", name: "Priya Mehta", service: "Free Trial Class", date: "Today", time: "6:00 PM", status: "confirmed" },
  { id: "2", name: "Amit Kumar", service: "Personal Training", date: "Today", time: "7:30 PM", status: "confirmed" },
  { id: "3", name: "Sneha Patel", service: "Yoga Class", date: "Tomorrow", time: "8:00 PM", status: "pending" },
  { id: "4", name: "Rajesh Gupta", service: "Gym Tour", date: "Tomorrow", time: "10:00 AM", status: "pending" },
  { id: "5", name: "Kavita Singh", service: "Zumba Class", date: "30 May", time: "6:00 PM", status: "confirmed" },
];

const statusConfig = {
  confirmed: { label: "Confirmed", variant: "success" as const },
  pending: { label: "Pending", variant: "warning" as const },
  cancelled: { label: "Cancelled", variant: "danger" as const },
  completed: { label: "Completed", variant: "default" as const },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleAddAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newApt: Appointment = {
      id: String(Date.now()),
      name: formData.get("name") as string,
      service: formData.get("service") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      status: "pending",
    };
    setAppointments((prev) => [newApt, ...prev]);
    setShowAddModal(false);
    setSuccessMsg("Appointment created successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function handleCancelAppointment(id: string) {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a));
    setSuccessMsg("Appointment cancelled");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const pending = appointments.filter((a) => a.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Manage bookings from WhatsApp conversations"
        actionLabel="New Appointment"
        actionIcon={Plus}
        onAction={() => setShowAddModal(true)}
      />

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {successMsg}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-text-primary">{appointments.length}</p><p className="text-xs text-text-secondary">Total Bookings</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Clock className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-text-primary">{confirmed}</p><p className="text-xs text-text-secondary">Confirmed</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><User className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-text-primary">{pending}</p><p className="text-xs text-text-secondary">Pending</p></div>
          </div>
        </Card>
      </div>

      {/* List */}
      <Card padding="none">
        <div className="p-4 border-b border-border"><h2 className="text-base font-semibold text-text-primary">Upcoming Appointments</h2></div>
        <div className="divide-y divide-border">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={apt.name} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{apt.name}</p>
                  <p className="text-xs text-text-secondary">{apt.service}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-text-primary">{apt.date}</p>
                  <p className="text-xs text-text-muted">{apt.time}</p>
                </div>
                <Badge variant={statusConfig[apt.status].variant}>{statusConfig[apt.status].label}</Badge>
                {apt.status !== "cancelled" && apt.status !== "completed" && (
                  <Button variant="ghost" size="sm" onClick={() => handleCancelAppointment(apt.id)}>Cancel</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">New Appointment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div><label className="text-sm font-medium text-text-primary block mb-1.5">Customer Name</label><input name="name" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Customer name" /></div>
              <div><label className="text-sm font-medium text-text-primary block mb-1.5">Service</label><input name="service" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g. Free Trial, Haircut" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-text-primary block mb-1.5">Date</label><input name="date" type="date" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                <div><label className="text-sm font-medium text-text-primary block mb-1.5">Time</label><input name="time" type="time" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Create Appointment</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
