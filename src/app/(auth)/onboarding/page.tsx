"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, Check, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";

const BUSINESS_TYPES = [
  { id: "gym", label: "Gym / Fitness", emoji: "🏋️" },
  { id: "salon", label: "Salon / Beauty", emoji: "💇" },
  { id: "clinic", label: "Clinic / Hospital", emoji: "🏥" },
  { id: "coaching", label: "Coaching Center", emoji: "📚" },
  { id: "restaurant", label: "Restaurant / Cafe", emoji: "🍽️" },
  { id: "real_estate", label: "Real Estate", emoji: "🏠" },
  { id: "other", label: "Other", emoji: "🏢" },
];

const AI_PERSONALITIES = [
  { id: "friendly", label: "Friendly", desc: "Warm, approachable, uses emojis" },
  { id: "professional", label: "Professional", desc: "Polite, formal, business-like" },
  { id: "sales", label: "Sales Focused", desc: "Persuasive, conversion-oriented" },
  { id: "premium", label: "Premium", desc: "Luxury brand tone, exclusive feel" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    description: "",
    website: "",
    address: "",
    services: [] as string[],
    serviceInput: "",
    openTime: "09:00",
    closeTime: "21:00",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    leadCollection: { name: true, phone: true, email: true, appointment_date: false },
    aiPersonality: "friendly",
    waPhoneNumberId: "",
    waBusinessAccountId: "",
    waAccessToken: "",
  });

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.onboarding_completed) {
          window.location.assign("/");
          return;
        }
        if (data.business) {
          setFormData((prev) => ({
            ...prev,
            type: data.business.type || "",
            name: data.business.name || "",
            description: data.business.description || "",
          }));
          setStep(data.current_step || 0);
        }
        setInitialLoading(false);
      })
      .catch(() => setInitialLoading(false));
  }, []);

  async function saveStep(stepNum: number, data: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNum, data }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStep(stepNum + 1 > 8 ? 8 : stepNum);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    switch (step) {
      case 0: setStep(1); break; // Welcome → Business Type
      case 1: saveStep(1, { type: formData.type }).then((ok) => ok && setStep(2)); break;
      case 2: saveStep(2, { name: formData.name, description: formData.description, website: formData.website, address: formData.address }).then((ok) => ok && setStep(3)); break;
      case 3: saveStep(3, { services: formData.services }).then((ok) => ok && setStep(4)); break;
      case 4: {
        const hours: Record<string, { open: string; close: string; closed: boolean }> = {};
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach((d) => {
          hours[d] = { open: formData.openTime, close: formData.closeTime, closed: !formData.workingDays.includes(d) };
        });
        saveStep(4, { business_hours: hours }).then((ok) => ok && setStep(5));
        break;
      }
      case 5: saveStep(5, { lead_collection: formData.leadCollection }).then((ok) => ok && setStep(6)); break;
      case 6: saveStep(6, { ai_personality: formData.aiPersonality, ai_tone: formData.aiPersonality }).then((ok) => ok && setStep(7)); break;
      case 7: {
        if (formData.waPhoneNumberId) {
          saveStep(7, { phone_number_id: formData.waPhoneNumberId, business_account_id: formData.waBusinessAccountId, access_token: formData.waAccessToken }).then((ok) => ok && setStep(8));
        } else {
          saveStep(7, { skip: true }).then((ok) => ok && setStep(8));
        }
        break;
      }
      case 8: saveStep(8, {}).then(() => window.location.assign("/select-plan")); break;
    }
  }

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold">BizBot AI</span>
        </div>

        {/* Progress */}
        {step > 0 && step < 8 && (
          <div className="flex gap-1 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-gray-200"}`} />
            ))}
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"><Zap className="w-8 h-8 text-primary" /></div>
            <h1 className="text-2xl font-bold mb-2">Welcome to BizBot AI</h1>
            <p className="text-text-secondary mb-8">Let&apos;s set up your AI assistant in under 2 minutes.</p>
            <Button className="w-full" size="lg" onClick={nextStep}>Continue Setup <ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}

        {/* Step 1: Business Type */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1">What type of business do you run?</h2>
            <p className="text-sm text-text-secondary mb-6">This helps our AI understand your domain.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {BUSINESS_TYPES.map((t) => (
                <button key={t.id} onClick={() => setFormData({ ...formData, type: t.id })} className={`p-4 rounded-xl border text-left transition-all ${formData.type === t.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                  <span className="text-2xl">{t.emoji}</span>
                  <p className="text-sm font-medium mt-2">{t.label}</p>
                </button>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={nextStep} disabled={!formData.type || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Business Profile */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Tell us about your business</h2>
            <p className="text-sm text-text-secondary mb-6">This information helps AI answer customer questions.</p>
            <div className="space-y-4 mb-6">
              <div><label className="text-sm font-medium block mb-1.5">Business Name *</label><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Shiva Gym" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Description *</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Describe your business, services, and what makes you special..." /></div>
              <div><label className="text-sm font-medium block mb-1.5">Address (optional)</label><input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Street, City" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={!formData.name || !formData.description || loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-1">What services do you offer?</h2>
            <p className="text-sm text-text-secondary mb-6">Add your main services. AI will use these to answer pricing questions.</p>
            <div className="flex gap-2 mb-4">
              <input value={formData.serviceInput} onChange={(e) => setFormData({ ...formData, serviceInput: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && formData.serviceInput.trim()) { setFormData({ ...formData, services: [...formData.services, formData.serviceInput.trim()], serviceInput: "" }); } }} className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Monthly Membership, Personal Training" />
              <Button variant="secondary" onClick={() => { if (formData.serviceInput.trim()) setFormData({ ...formData, services: [...formData.services, formData.serviceInput.trim()], serviceInput: "" }); }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
              {formData.services.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full flex items-center gap-1.5">{s}<button onClick={() => setFormData({ ...formData, services: formData.services.filter((_, j) => j !== i) })} className="text-primary/60 hover:text-primary">×</button></span>
              ))}
              {formData.services.length === 0 && <p className="text-xs text-text-muted">No services added yet. Press Enter or click Add.</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 4: Business Hours */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Business Hours</h2>
            <p className="text-sm text-text-secondary mb-6">When are you open?</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="text-sm font-medium block mb-1.5">Opening Time</label><input type="time" value={formData.openTime} onChange={(e) => setFormData({ ...formData, openTime: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Closing Time</label><input type="time" value={formData.closeTime} onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
            </div>
            <div className="mb-6">
              <label className="text-sm font-medium block mb-2">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {[["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]].map(([id, label]) => (
                  <button key={id} onClick={() => setFormData({ ...formData, workingDays: formData.workingDays.includes(id) ? formData.workingDays.filter((d) => d !== id) : [...formData.workingDays, id] })} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.workingDays.includes(id) ? "bg-primary text-white" : "bg-gray-100 text-text-secondary"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 5: Lead Collection */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold mb-1">What info should AI collect?</h2>
            <p className="text-sm text-text-secondary mb-6">AI will naturally ask for these during conversation.</p>
            <div className="space-y-3 mb-6">
              {([["name", "Customer Name"], ["phone", "Phone Number"], ["email", "Email Address"], ["appointment_date", "Preferred Appointment Date"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={formData.leadCollection[key]} onChange={(e) => setFormData({ ...formData, leadCollection: { ...formData.leadCollection, [key]: e.target.checked } })} className="w-4 h-4 rounded text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(4)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 6: AI Personality */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Choose AI personality</h2>
            <p className="text-sm text-text-secondary mb-6">How should your AI assistant communicate?</p>
            <div className="space-y-3 mb-6">
              {AI_PERSONALITIES.map((p) => (
                <button key={p.id} onClick={() => setFormData({ ...formData, aiPersonality: p.id })} className={`w-full p-4 rounded-xl border text-left transition-all ${formData.aiPersonality === p.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(5)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 7: WhatsApp */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Connect WhatsApp (Optional)</h2>
            <p className="text-sm text-text-secondary mb-6">You can skip this and connect later from Settings.</p>
            <div className="space-y-4 mb-6">
              <div><label className="text-sm font-medium block mb-1.5">Phone Number ID</label><input value={formData.waPhoneNumberId} onChange={(e) => setFormData({ ...formData, waPhoneNumberId: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="From Meta Developer Dashboard" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Access Token</label><input type="password" value={formData.waAccessToken} onChange={(e) => setFormData({ ...formData, waAccessToken: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Permanent access token" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(6)}><ArrowLeft className="w-4 h-4" /></Button>
              <Button className="flex-1" size="lg" onClick={nextStep} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {formData.waPhoneNumberId ? "Connect & Continue" : "Skip for Now"} <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 8: Success */}
        {step === 8 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
            <h1 className="text-2xl font-bold mb-2">🎉 BizBot is Ready!</h1>
            <p className="text-text-secondary mb-6">Your AI assistant is configured and ready to go.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /><span>Business configured</span></div>
              <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /><span>AI personality set</span></div>
              <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /><span>Domain restrictions active</span></div>
              <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500" /><span>{formData.waPhoneNumberId ? "WhatsApp connected" : "WhatsApp (connect later)"}</span></div>
            </div>
            <Button className="w-full" size="lg" onClick={nextStep} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Activate Free Trial & Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
