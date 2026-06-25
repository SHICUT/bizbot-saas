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
  const [showManualSetup, setShowManualSetup] = useState(false);

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
          {waData.connected ? (
            <>
              {/* Connected State — Clean Status View */}
              <Card>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text-primary">WhatsApp Connected</h3>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <p className="text-sm text-text-muted mt-0.5">Your AI assistant is replying to customer messages automatically.</p>
                  </div>
                </div>
              </Card>

              {/* Connection Details */}
              <Card>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Connection Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Status</span>
                    <span className="text-sm font-medium text-emerald-600">● Connected</span>
                  </div>
                  {waData.connectedAt && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Connected Since</span>
                      <span className="text-sm font-medium">{new Date(waData.connectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-muted">AI Auto-Reply</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleWhatsAppDisconnect} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <Card>
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Connect WhatsApp</h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                    Connect your WhatsApp Business number to start receiving messages and let AI reply automatically.
                  </p>

                  {/* Facebook Embedded Signup Button */}
                  <FacebookConnectButton
                    onSuccess={(data) => {
                      setWaData({ phoneNumberId: data.phone_number_id, businessAccountId: data.waba_id || "", accessToken: "••••••••••••••••", connected: true, connectedAt: new Date().toISOString() });
                      setSuccessMsg(`WhatsApp connected! Phone: ${data.phone_number || "Connected"}`);
                    }}
                    onError={(err) => setErrorMsg(err)}
                  />

                  {/* Manual Setup Link */}
                  <div className="mt-5 pt-4 border-t border-border">
                    <button onClick={() => setShowManualSetup(!showManualSetup)} className="text-xs text-text-muted hover:text-primary font-medium transition-colors">
                      {showManualSetup ? "Hide manual setup" : "Use Manual Setup (Advanced) →"}
                    </button>
                  </div>
                </div>
              </Card>

              {/* Manual Setup Form (hidden by default) */}
              {showManualSetup && (
                <Card>
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Manual Setup (Advanced)</h3>
                  <p className="text-xs text-text-muted mb-4">Enter credentials from your Meta Developer Dashboard.</p>
                  <form onSubmit={handleWhatsAppConnect} className="space-y-4">
                    <Input id="phoneNumberId" name="phoneNumberId" label="Phone Number ID" placeholder="From Meta Developer Dashboard" required />
                    <Input id="businessAccountId" name="businessAccountId" label="Business Account ID" placeholder="Optional" />
                    <Input id="accessToken" name="accessToken" label="Access Token" type="password" placeholder="System User token" required />
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Verifying..." : "Connect"}
                    </Button>
                  </form>
                </Card>
              )}

              {/* How it works */}
              <Card className="bg-blue-50/50 border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works</h4>
                <div className="space-y-2 text-xs text-blue-700">
                  <p>1. Click "Connect with Facebook" and log in</p>
                  <p>2. Select your WhatsApp Business account</p>
                  <p>3. Your AI assistant starts replying instantly</p>
                </div>
              </Card>
            </>
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

// ─── Facebook Connect Button ─────────────────────────────────────────────────

function FacebookConnectButton({ onSuccess, onError }: {
  onSuccess: (data: { phone_number_id: string; waba_id?: string; phone_number?: string }) => void;
  onError: (error: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading_sdk" | "initializing" | "opening" | "exchanging">("idle");
  const [fbError, setFbError] = useState<string | null>(null);

  const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;

  async function handleClick() {
    setFbError(null);
    console.log("[Embedded Signup] Button clicked");
    console.log("[Embedded Signup] NEXT_PUBLIC_META_APP_ID =", META_APP_ID || "NOT SET");
    console.log("[Embedded Signup] NEXT_PUBLIC_META_CONFIG_ID =", process.env.NEXT_PUBLIC_META_CONFIG_ID || "NOT SET");

    // Validate App ID
    if (!META_APP_ID) {
      const errMsg = "Meta App ID is not configured. Set NEXT_PUBLIC_META_APP_ID in Vercel environment variables.";
      console.error("[Embedded Signup]", errMsg);
      setFbError(errMsg);
      onError(errMsg);
      return;
    }

    // Load SDK if not loaded
    setStatus("loading_sdk");
    console.log("[Embedded Signup] Loading SDK...");

    try {
      await loadFacebookSDK(META_APP_ID);
    } catch (err) {
      const errMsg = `Facebook SDK failed to load: ${err instanceof Error ? err.message : "Network error"}`;
      console.error("[Embedded Signup]", errMsg);
      setFbError(errMsg);
      setStatus("idle");
      onError(errMsg);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FB = (window as any).FB;
    if (!FB) {
      const errMsg = "Facebook SDK loaded but FB object not available. Please refresh.";
      console.error("[Embedded Signup]", errMsg);
      setFbError(errMsg);
      setStatus("idle");
      onError(errMsg);
      return;
    }

    // Launch OAuth
    setStatus("opening");
    console.log("[Embedded Signup] Launching OAuth popup...");

    // Build login options
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    const loginOptions: Record<string, unknown> = {
      response_type: "code",
      override_default_response_type: true,
    };

    if (configId) {
      // Full Embedded Signup flow (requires WhatsApp Embedded Signup config in Meta Dashboard)
      loginOptions.config_id = configId;
      loginOptions.extras = { setup: {}, featureType: "", sessionInfoVersion: 2 };
      console.log("[Embedded Signup] Using config_id:", configId);
    } else {
      // Standard OAuth flow (requests permissions directly)
      loginOptions.scope = "whatsapp_business_management,whatsapp_business_messaging,business_management";
      console.log("[Embedded Signup] No config_id — using standard OAuth with scope");
    }

    FB.login((response: { authResponse?: { code?: string }; status?: string }) => {
      console.log("[Embedded Signup] OAuth response:", response.status, response.authResponse ? "has auth" : "no auth");

      if (!response.authResponse?.code) {
        const errMsg = response.status === "unknown" 
          ? "Login cancelled. Please try again." 
          : "Facebook login failed. Check popup blocker or try again.";
        console.error("[Embedded Signup]", errMsg);
        setFbError(errMsg);
        setStatus("idle");
        return;
      }

      // Exchange code
      setStatus("exchanging");
      console.log("[Embedded Signup] Exchanging code for credentials...");

      fetch("/api/business/whatsapp-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: response.authResponse.code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("[Embedded Signup] ✓ SUCCESS:", data);
            setStatus("idle");
            onSuccess({ phone_number_id: data.phone_number_id, waba_id: data.waba_id, phone_number: data.phone_number });
          } else {
            const errMsg = data.error || "Connection failed. Please try again.";
            console.error("[Embedded Signup] Backend error:", errMsg);
            setFbError(errMsg);
            setStatus("idle");
            onError(errMsg);
          }
        })
        .catch((err) => {
          const errMsg = "Network error during connection. Please try again.";
          console.error("[Embedded Signup] Fetch error:", err);
          setFbError(errMsg);
          setStatus("idle");
          onError(errMsg);
        });
    }, loginOptions);
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={status !== "idle"} className="w-full max-w-xs">
        {status === "idle" && <><MessageSquare className="w-4 h-4" /> Connect with Facebook</>}
        {status === "loading_sdk" && <><Loader2 className="w-4 h-4 animate-spin" /> Loading Facebook SDK...</>}
        {status === "initializing" && <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</>}
        {status === "opening" && <><Loader2 className="w-4 h-4 animate-spin" /> Opening Facebook...</>}
        {status === "exchanging" && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting account...</>}
      </Button>

      {fbError && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-left max-w-xs mx-auto">
          <p className="text-xs text-red-700">{fbError}</p>
        </div>
      )}
    </div>
  );
}

function loadFacebookSDK(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).FB) { resolve(); return; }

    // Already loading
    if (document.getElementById("facebook-jssdk")) {
      // Wait for it to finish
      const check = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).FB) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("SDK load timeout")); }, 10000);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).fbAsyncInit = function() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).FB.init({ appId, cookie: true, xfbml: true, version: "v23.0" });
      console.log("[Embedded Signup] SDK Initialized ✓");
      resolve();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Facebook SDK script"));
    document.head.appendChild(script);
  });
}
