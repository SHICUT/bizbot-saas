import { Shield, MessageSquare, Bot, Clock, Lock, Building2 } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, label: "Secure Platform", color: "blue" },
  { icon: MessageSquare, label: "WhatsApp Official API Support", color: "emerald" },
  { icon: Bot, label: "AI Powered Automation", color: "purple" },
  { icon: Clock, label: "24/7 Support", color: "amber" },
  { icon: Lock, label: "Data Privacy & Encryption", color: "rose" },
  { icon: Building2, label: "Multi Business Support", color: "indigo" },
];

const COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  rose: { bg: "bg-rose-50", text: "text-rose-600" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
};

export default function TrustSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Why Businesses Trust FlowNex
          </h2>
          <p className="text-gray-600">Enterprise-grade platform built for growing businesses.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRUST_ITEMS.map((item) => {
            const c = COLORS[item.color];
            return (
              <div
                key={item.label}
                className="flex flex-col items-center text-center p-5 rounded-xl border border-gray-100 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-6 h-6 ${c.text}`} />
                </div>
                <p className="text-xs font-medium text-gray-700 leading-tight">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
