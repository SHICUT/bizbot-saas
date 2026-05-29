"use client";

import { useState } from "react";
import { Plus, Calendar, X, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layout/PageHeader";

export default function AppointmentsPage() {
  const [appointments] = useState<Array<{ id: string; name: string; service: string; date: string; time: string; status: "confirmed" | "pending" | "cancelled" }>>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading] = useState(false);

  const statusConfig = {
    confirmed: { label: "Confirmed", variant: "success" as const },
    pending: { label: "Pending", variant: "warning" as const },
    cancelled: { label: "Cancelled", variant: "danger" as const },
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <PageHeader title="Appointments" description="Manage bookings from conversations" actionLabel="New Appointment" actionIcon={Plus} onAction={() => setShowAddModal(true)} />

      {successMsg && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {successMsg}</div>}

      {appointments.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Calendar className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No appointments yet</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Appointments will appear here when customers book through WhatsApp or when you create them manually.
            </p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" /> Create First Appointment
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="p-4 border-b border-border"><h2 className="text-base font-semibold">Upcoming Appointments</h2></div>
          <div className="divide-y divide-border">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                <div className="flex items-center gap-3"><Avatar name={apt.name} /><div><p className="text-sm font-medium">{apt.name}</p><p className="text-xs text-text-secondary">{apt.service}</p></div></div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block"><p className="text-sm font-medium">{apt.date}</p><p className="text-xs text-text-muted">{apt.time}</p></div>
                  <Badge variant={statusConfig[apt.status].variant}>{statusConfig[apt.status].label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">New Appointment</h3><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-text-muted" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); setSuccessMsg("Appointment created!"); setTimeout(() => setSuccessMsg(null), 3000); }} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1.5">Customer Name</label><input name="name" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Service</label><input name="service" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1.5">Date</label><input name="date" type="date" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Time</label><input name="time" type="time" required className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
              </div>
              <div className="flex gap-2"><Button type="submit" className="flex-1">Create</Button><Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
