"use client";

import { useState } from "react";
import { MessageCircle, X, Phone, Mail, Calendar, HelpCircle, MessageSquare } from "lucide-react";

const SUPPORT_PHONE = "919572495969";
const SUPPORT_EMAIL = "shivam95ku@gmail.com";

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Menu */}
      {open && (
        <div className="mb-3 w-64 bg-white rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-bold">Need Help?</h3>
            <p className="text-xs text-text-muted mt-0.5">We&apos;re here to assist you</p>
          </div>
          <div className="p-2">
            <a href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi, I need help with BizBot.")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 transition-colors">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <div><p className="text-sm font-medium">WhatsApp Support</p><p className="text-[10px] text-text-muted">Chat with us instantly</p></div>
            </a>
            <a href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi, I'd like to request a callback for BizBot setup help.\n\nName: \nPhone: \nBusiness: ")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors">
              <Phone className="w-4 h-4 text-blue-600" />
              <div><p className="text-sm font-medium">Request Callback</p><p className="text-[10px] text-text-muted">We&apos;ll call you back</p></div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=BizBot Support Request`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 transition-colors">
              <Mail className="w-4 h-4 text-purple-600" />
              <div><p className="text-sm font-medium">Email Support</p><p className="text-[10px] text-text-muted">{SUPPORT_EMAIL}</p></div>
            </a>
            <a href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi, I'd like to book a free setup session for BizBot.\n\nBusiness Name: \nPlan: ")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors">
              <Calendar className="w-4 h-4 text-amber-600" />
              <div><p className="text-sm font-medium">Book Setup Session</p><p className="text-[10px] text-text-muted">Free WhatsApp setup help</p></div>
            </a>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${open ? "bg-gray-800 hover:bg-gray-900" : "bg-emerald-600 hover:bg-emerald-700"}`}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
      </button>
    </div>
  );
}
