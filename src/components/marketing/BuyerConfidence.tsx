import { Zap, ShieldCheck, Clock, Calendar, TrendingUp } from "lucide-react";

const METRICS = [
  {
    icon: Zap,
    title: "Faster Lead Response",
    desc: "AI responds in under 3 seconds — 24/7",
    stat: "3s",
  },
  {
    icon: ShieldCheck,
    title: "Reduced Lead Leakage",
    desc: "Capture every inquiry, even at midnight",
    stat: "0%",
  },
  {
    icon: Clock,
    title: "Automated Follow-Ups",
    desc: "3-step sequences re-engage cold leads",
    stat: "3x",
  },
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    desc: "AI books appointments from chat directly",
    stat: "85%",
  },
  {
    icon: TrendingUp,
    title: "Higher Conversion Rates",
    desc: "Convert more leads into paying customers",
    stat: "2.5x",
  },
];

export default function BuyerConfidence() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Businesses Choose FlowNex
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Measurable improvements that directly impact your bottom line.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {METRICS.map((m) => (
            <div
              key={m.title}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-colors">
                <m.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold gradient-text mb-1">{m.stat}</p>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{m.title}</h3>
              <p className="text-xs text-gray-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
