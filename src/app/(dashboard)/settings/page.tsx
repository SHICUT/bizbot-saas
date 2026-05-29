"use client";

import { useState } from "react";
import { Save, User, Building, MessageSquare, Shield } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/layout/PageHeader";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "business" | "whatsapp" | "security">("profile");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 1000);
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "business" as const, label: "Business", icon: Building },
    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and business settings" />

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {successMsg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card>
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <Input id="fullName" name="fullName" label="Full Name" defaultValue="Rahul Sharma" />
            <Input id="email" name="email" label="Email" type="email" defaultValue="rahul@fitzone.in" />
            <Input id="phone" name="phone" label="Phone" type="tel" defaultValue="+91 98765 43210" />
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      )}

      {/* Business Tab */}
      {activeTab === "business" && (
        <Card>
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <Input id="bizName" name="bizName" label="Business Name" defaultValue="FitZone Gym" />
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">Business Type</label>
              <select className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option>Gym</option>
                <option>Salon</option>
                <option>Clinic</option>
                <option>Coaching Center</option>
                <option>Restaurant</option>
                <option>Other</option>
              </select>
            </div>
            <Input id="address" name="address" label="Address" defaultValue="Koregaon Park, Pune" />
            <Input id="city" name="city" label="City" defaultValue="Pune" />
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      )}

      {/* WhatsApp Tab */}
      {activeTab === "whatsapp" && (
        <Card>
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">WhatsApp Connected</span>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <Input id="phoneNumberId" name="phoneNumberId" label="Phone Number ID" placeholder="Enter Meta Phone Number ID" />
              <Input id="businessAccountId" name="businessAccountId" label="Business Account ID" placeholder="Enter WABA ID" />
              <Input id="accessToken" name="accessToken" label="Access Token" type="password" placeholder="Enter access token" />
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? "Connecting..." : "Save & Connect"}
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <Card>
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <Input id="currentPassword" name="currentPassword" label="Current Password" type="password" placeholder="Enter current password" />
            <Input id="newPassword" name="newPassword" label="New Password" type="password" placeholder="Enter new password" />
            <Input id="confirmPassword" name="confirmPassword" label="Confirm New Password" type="password" placeholder="Confirm new password" />
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
