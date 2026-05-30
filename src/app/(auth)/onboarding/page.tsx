"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, Check, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";

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

const TOTAL_STEPS = 8;

const slideVariants = {
  enter: { x: 30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: "", name: "", description: "", address: "",
    services: [] as string[], serviceInput: "",
    openTime: "09:00", closeTime: "21:00",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    leadCollection: { name: true, phone: true, email: true, appointment_date: false },
    aiPersonality: "friendly",
    waPhoneNumberId: "", waAccessToken: "",
  });

  useEffect(() => {
    fetch("/api/onboarding").then((r) => r.json()).then((data) => {
      if (data.onboarding_completed) { window.location.assign("/"); return; }
      if (data.business) {
        setFormData((p) => ({ ...p, type: data.business.type || "", name: data.business.name || "", description: data.business.description || "" }));
      }
      setInitialLoading(false);
    }).catch(() => setInitialLoading(false));
  }, []);

  function goNext() {
    setDirection(1);
    const nextStep = step + 1;

    // Validation
    if (step === 1 && !formData.type) return;
    if (step === 2 && !formData.name) return;

    // Move immediately (optimistic)
    setStep(nextStep);

    // Save in background
    const saveData = getSaveData(step);
    if (saveData) saveStepBackground(step, saveData);
  }

  function goBack() {
    setDirection(-1);
    setStep(step - 1);
  }

  function finishOnboarding() {
    setSaving(true);
    saveStepBackground(8, {}).then(() => {
      // Show success for 1.5s then redirect
      setTimeout(() => window.location.assign("/select-plan"), 1500);
    });
  }

  function getSaveData(s: number): Record<string, unknown> | null {
    switch (s) {
      case 1: return { type: formData.type };
      case 2: return { name: formData.name, description: formData.description, address: formData.address };
      case 3: return { services: formData.services };
      case 4: {
        const hours: Record<string, unknown> = {};
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach((d) => {
          hours[d] = { open: formData.openTime, close: formData.closeTime, closed: !formData.workingDays.includes(d) };
        });
        return { business_hours: hours };
      }
      case 5: return { lead_collection: formData.leadCollection };
      case 6: return { ai_personality: formData.aiPersonality, ai_tone: formData.aiPersonality };
      case 7: return formData.waPhoneNumberId ? { phone_number_id: formData.waPhoneNumberId, access_token: formData.waAccessToken } : { skip: true };
      default: return null;
    }
  }

  async function saveStepBackground(stepNum: number, data: Record<string, unknown>) {
    try {
      await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: stepNum, data }) });
    } catch { /* silent */ }
  }

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold">BizBot AI</span>
        </div>
      </div>

      {/* Progress Bar */}
      {step > 0 && step < 8 && (
        <div className="px-6 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Step {step} of {TOTAL_STEPS - 1}</span>
            <span className="text-xs text-primary font-medium">{Math.round((step / (TOTAL_STEPS - 1)) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h1 className="text-3xl font-bold mb-3">Welcome to BizBot AI</h1>
                  <p className="text-text-secondary mb-8 text-lg">Let&apos;s set up your AI assistant in under 2 minutes.</p>
                  <button onClick={goNext} className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-base hover:bg-primary-hover transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 1: Business Type */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">What type of business?</h2>
                  <p className="text-text-secondary mb-6">This helps our AI understand your domain.</p>
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {BUSINESS_TYPES.map((t) => (
                      <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setFormData({ ...formData, type: t.id })} className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${formData.type === t.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border hover:border-primary/30 hover:bg-gray-50"}`}>
                        <span className="text-2xl">{t.emoji}</span>
                        <p className="text-sm font-medium mt-2">{t.label}</p>
                      </motion.button>
                    ))}
                  </div>
                  <NavButtons onNext={goNext} disabled={!formData.type} />
                </div>
              )}

              {/* Step 2: Business Profile */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">About your business</h2>
                  <p className="text-text-secondary mb-6">AI uses this to answer customer questions.</p>
                  <div className="space-y-4 mb-8">
                    <InputField label="Business Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Shiva Gym" required />
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Description</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-3 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none" placeholder="What does your business do? Services, specialties..." />
                    </div>
                    <InputField label="Address (optional)" value={formData.address} onChange={(v) => setFormData({ ...formData, address: v })} placeholder="Street, City" />
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} disabled={!formData.name} />
                </div>
              )}

              {/* Step 3: Services */}
              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Your services</h2>
                  <p className="text-text-secondary mb-6">Add services you offer. Press Enter to add.</p>
                  <div className="flex gap-2 mb-4">
                    <input value={formData.serviceInput} onChange={(e) => setFormData({ ...formData, serviceInput: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && formData.serviceInput.trim()) { setFormData({ ...formData, services: [...formData.services, formData.serviceInput.trim()], serviceInput: "" }); } }} className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Monthly Membership" />
                    <button onClick={() => { if (formData.serviceInput.trim()) setFormData({ ...formData, services: [...formData.services, formData.serviceInput.trim()], serviceInput: "" }); }} className="px-4 py-3 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-colors">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-8 min-h-[48px]">
                    {formData.services.map((s, i) => (
                      <motion.span key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full flex items-center gap-1.5 font-medium">{s}<button onClick={() => setFormData({ ...formData, services: formData.services.filter((_, j) => j !== i) })} className="text-primary/50 hover:text-primary ml-1">×</button></motion.span>
                    ))}
                    {formData.services.length === 0 && <p className="text-sm text-text-muted py-2">No services added yet</p>}
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} />
                </div>
              )}

              {/* Step 4: Business Hours */}
              {step === 4 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Business hours</h2>
                  <p className="text-text-secondary mb-6">When are you open?</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <InputField label="Opening" type="time" value={formData.openTime} onChange={(v) => setFormData({ ...formData, openTime: v })} />
                    <InputField label="Closing" type="time" value={formData.closeTime} onChange={(v) => setFormData({ ...formData, closeTime: v })} />
                  </div>
                  <div className="mb-8">
                    <label className="text-sm font-medium block mb-3">Working days</label>
                    <div className="flex flex-wrap gap-2">
                      {[["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]].map(([id, label]) => (
                        <button key={id} onClick={() => setFormData({ ...formData, workingDays: formData.workingDays.includes(id) ? formData.workingDays.filter((d) => d !== id) : [...formData.workingDays, id] })} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.workingDays.includes(id) ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} />
                </div>
              )}

              {/* Step 5: Lead Collection */}
              {step === 5 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">What should AI collect?</h2>
                  <p className="text-text-secondary mb-6">AI will naturally ask for these during conversation.</p>
                  <div className="space-y-3 mb-8">
                    {([["name", "Customer Name"], ["phone", "Phone Number"], ["email", "Email Address"], ["appointment_date", "Preferred Date"]] as const).map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.leadCollection[key] ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <input type="checkbox" checked={formData.leadCollection[key]} onChange={(e) => setFormData({ ...formData, leadCollection: { ...formData.leadCollection, [key]: e.target.checked } })} className="w-5 h-5 rounded-md text-primary border-2 border-border focus:ring-primary/30" />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} />
                </div>
              )}

              {/* Step 6: AI Personality */}
              {step === 6 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">AI personality</h2>
                  <p className="text-text-secondary mb-6">How should your assistant communicate?</p>
                  <div className="space-y-3 mb-8">
                    {AI_PERSONALITIES.map((p) => (
                      <motion.button key={p.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setFormData({ ...formData, aiPersonality: p.id })} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${formData.aiPersonality === p.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border hover:border-primary/30"}`}>
                        <p className="text-sm font-semibold">{p.label}</p>
                        <p className="text-xs text-text-muted mt-0.5">{p.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} />
                </div>
              )}

              {/* Step 7: WhatsApp */}
              {step === 7 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Connect WhatsApp</h2>
                  <p className="text-text-secondary mb-6">Optional — you can do this later from Settings.</p>
                  <div className="space-y-4 mb-8">
                    <InputField label="Phone Number ID" value={formData.waPhoneNumberId} onChange={(v) => setFormData({ ...formData, waPhoneNumberId: v })} placeholder="From Meta Developer Dashboard" />
                    <InputField label="Access Token" type="password" value={formData.waAccessToken} onChange={(v) => setFormData({ ...formData, waAccessToken: v })} placeholder="Permanent access token" />
                  </div>
                  <NavButtons onBack={goBack} onNext={goNext} nextLabel={formData.waPhoneNumberId ? "Connect & Continue" : "Skip for Now"} />
                </div>
              )}

              {/* Step 8: Success */}
              {step === 8 && (
                <div className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-bold mb-3">🎉 BizBot is Ready!</motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-text-secondary mb-8">Your AI assistant is configured.</motion.p>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-50 rounded-xl p-5 mb-8 text-left space-y-3">
                    {["Business configured", "AI personality set", "Domain restrictions active", "Ready to receive messages"].map((item, i) => (
                      <motion.div key={item} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-600" /></div>
                        <span className="text-sm">{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} onClick={finishOnboarding} disabled={saving} className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-base hover:bg-primary-hover transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-70">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your AI...</> : <>Activate Free Trial <ArrowRight className="w-4 h-4" /></>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavButtons({ onBack, onNext, disabled, nextLabel }: { onBack?: () => void; onNext: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex gap-3 sticky bottom-6">
      {onBack && (
        <button onClick={onBack} className="px-4 py-3 rounded-xl border-2 border-border text-text-secondary hover:bg-gray-50 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
      <button onClick={onNext} disabled={disabled} className="flex-1 py-3.5 rounded-xl bg-primary text-white font-medium text-base hover:bg-primary-hover transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {nextLabel || "Next"} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 text-sm rounded-xl border-2 border-border bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder={placeholder} />
    </div>
  );
}
