"use client";

import { useState, useEffect } from "react";
import { Save, User, Building, MessageSquare, Shield, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "business" | "whatsapp" | "security">("profile");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userData, setUserData] = useState({ name: "", email: "", phone: "" });
  const [bizData, setBizData] = useState({ name: "", type: "other", address: "", city: "" });
  const [waData, setWaData] = useState({ phoneNumberId: "", businessAccountId: "", accessToken: "", connected: false, connectedAt: "" });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserData({ name: data.user.name || "", email: data.user.email || "", phone: data.user.phone || "" });
        if (data.business) {
          setBizData({ name: data.business.name || "", type: data.business.type || "other", address: data.business.address || "", city: data.business.city || "" });
          setWaData({
            phoneNumberId: data.business.whatsapp_phone_number_id || "",
            businessAccountId: data.business.whatsapp_business_account_id || "",
            accessToken: data.business.whatsapp_access_token ? "••••••••••••••••" : "",
            connected: data.business.whatsapp_connected === true,
            connectedAt: data.business.whatsapp_connected_at || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "profile",
          data: {
            name: bizData.name,
            owner_name: userData.name,
            type: bizData.type,
            address: bizData.address,
            city: bizData.city,
            phone: userData.phone,
            email: userData.email,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSuccessMsg("Settings saved!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to save. Please try again.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
    setSaving(false);
  }

  async function handleWhatsAppConnect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = e.target as HTMLFormElement;
    const phoneNumberId = (form.elements.namedItem("phoneNumberId") as HTMLInputElement).value.trim();
    const businessAccountId = (form.elements.namedItem("businessAccountId") as HTMLInputElement).value.trim();
    const accessToken = (form.elements.namedItem("accessToken") as HTMLInputElement).value.trim();

    if (!phoneNumberId || !accessToken) {
      setErrorMsg("Phone Number ID and Access Token are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/business/connect-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          access_token: accessToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Connection failed. Check your credentials.");
        setSaving(false);
        return;
      }

      setWaData({ phoneNumberId, businessAccountId, accessToken: "••••••••••••••••", connected: true, connectedAt: new Date().toISOString() });
      setSuccessMsg("WhatsApp connected successfully! Configure your webhook in Meta Dashboard.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleWhatsAppDisconnect() {
    setSaving(true);
    try {
      await fetch("/api/business/connect-whatsapp", { method: "DELETE" });
      setWaData({ phoneNumberId: "", businessAccountId: "", accessToken: "", connected: false, connectedAt: "" });
      setSuccessMsg("WhatsApp disconnected.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to disconnect.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "business" as const, label: "Business", icon: Building },
    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and business settings" />
      {successMsg && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{successMsg}</div>}
      {errorMsg && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorMsg}</div>}

      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setErrorMsg(null); setSuccessMsg(null); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.id === "whatsapp" && (
              <span className={`w-2 h-2 rounded-full ${waData.connected ? "bg-emerald-500" : "bg-gray-300"}`} />
            )}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <Card><form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <Input id="fullName" label="Full Name" value={userData.name} onChange={(e) => setUserData({ ...userData, name: e.target.value })} />
          <Input id="email" label="Email" type="email" value={userData.email} onChange={(e) => setUserData({ ...userData, email: e.target.value })} />
          <Input id="phone" label="Phone" type="tel" value={userData.phone} onChange={(e) => setUserData({ ...userData, phone: e.target.value })} placeholder="+91 98765 43210" />
          <Button type="submit" disabled={saving}><Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}</Button>
        </form></Card>
      )}

      {activeTab === "business" && (
        <Card><form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <Input id="bizName" label="Business Name" value={bizData.name} onChange={(e) => setBizData({ ...bizData, name: e.target.value })} />
          <div><label className="text-sm font-medium block mb-1.5">Business Type</label>
            <select value={bizData.type} onChange={(e) => setBizData({ ...bizData, type: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="gym">Gym</option><option value="salon">Salon</option><option value="clinic">Clinic</option><option value="coaching">Coaching Center</option><option value="restaurant">Restaurant</option><option value="other">Other</option>
            </select>
          </div>
          <Input id="address" label="Address" value={bizData.address} onChange={(e) => setBizData({ ...bizData, address: e.target.value })} />
          <Input id="city" label="City" value={bizData.city} onChange={(e) => setBizData({ ...bizData, city: e.target.value })} />
          <Button type="submit" disabled={saving}><Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}</Button>
        </form></Card>
      )}

      {activeTab === "whatsapp" && (
        <div className="max-w-2xl space-y-6">
          {/* Connection Status */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {waData.connected ? (
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><XCircle className="w-5 h-5 text-gray-400" /></div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">WhatsApp Business</h3>
                    <Badge variant={waData.connected ? "success" : "default"}>
                      {waData.connected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  {waData.connected && waData.connectedAt && (
                    <p className="text-xs text-text-muted mt-0.5">Connected on {new Date(waData.connectedAt).toLocaleDateString()}</p>
                  )}
                  {!waData.connected && (
                    <p className="text-xs text-text-muted mt-0.5">Connect your WhatsApp Business account to start receiving messages</p>
                  )}
                </div>
              </div>
              {waData.connected && (
                <Button variant="ghost" size="sm" onClick={handleWhatsAppDisconnect} disabled={saving}>Disconnect</Button>
              )}
            </div>
          </Card>

          {/* Connection Form */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {waData.connected ? "Update Credentials" : "Connect WhatsApp"}
            </h3>
            <form onSubmit={handleWhatsAppConnect} className="space-y-4">
              <Input
                id="phoneNumberId"
                name="phoneNumberId"
                label="Phone Number ID"
                placeholder="e.g. 123456789012345"
                defaultValue={waData.phoneNumberId}
                required
              />
              <Input
                id="businessAccountId"
                name="businessAccountId"
                label="Business Account ID (optional)"
                placeholder="e.g. 987654321098765"
                defaultValue={waData.businessAccountId}
              />
              <Input
                id="accessToken"
                name="accessToken"
                label="Permanent Access Token"
                type="password"
                placeholder={waData.connected ? "Enter new token to update" : "Enter your access token"}
                required={!waData.connected}
              />
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-medium mb-1">How to get these credentials:</p>
                <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                  <li>Go to Meta Developer Dashboard → Your App → WhatsApp</li>
                  <li>Copy Phone Number ID from Getting Started</li>
                  <li>Create a System User token with whatsapp_business_messaging permission</li>
                </ol>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Verifying..." : waData.connected ? "Update & Verify" : "Connect & Verify"}
              </Button>
            </form>
          </Card>

          {/* Webhook Info (shown after connection) */}
          {waData.connected && (
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Webhook Configuration</h3>
              <p className="text-xs text-text-muted mb-3">Configure these in your Meta Developer Dashboard → WhatsApp → Configuration:</p>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3 font-mono text-xs">
                <div><span className="text-text-muted">Callback URL:</span><br /><span className="text-text-primary select-all">{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp</span></div>
                <div><span className="text-text-muted">Verify Token:</span><br /><span className="text-text-primary select-all">Set in your Vercel environment variables (WHATSAPP_VERIFY_TOKEN)</span></div>
                <div><span className="text-text-muted">Subscribe to:</span><br /><span className="text-text-primary">messages</span></div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <Card><form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <Input id="currentPassword" label="Current Password" type="password" placeholder="Enter current password" />
          <Input id="newPassword" label="New Password" type="password" placeholder="Enter new password" />
          <Input id="confirmPassword" label="Confirm Password" type="password" placeholder="Confirm new password" />
          <Button type="submit" disabled={saving}><Save className="w-4 h-4" />{saving ? "Updating..." : "Update Password"}</Button>
        </form></Card>
      )}
    </div>
  );
}
