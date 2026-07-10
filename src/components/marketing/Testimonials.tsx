import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Rahul Sharma",
    company: "FitZone Gym",
    industry: "Fitness & Gym",
    rating: 5,
    date: "2026-05-15",
    text: "FlowNex handles 90% of my inquiries automatically. I went from missing leads to booking 3x more trial sessions. The AI responds faster than my receptionist ever could.",
    avatar: "RS",
  },
  {
    name: "Priya Mehta",
    company: "Glow Beauty Salon",
    industry: "Salon & Spa",
    rating: 5,
    date: "2026-04-22",
    text: "My customers get instant replies even at midnight. Appointment bookings doubled in the first month. I wish I had this tool years ago.",
    avatar: "PM",
  },
  {
    name: "Amit Kapoor",
    company: "Prime Realty Group",
    industry: "Real Estate",
    rating: 5,
    date: "2026-03-10",
    text: "Every property inquiry is now captured and followed up. I closed 4 extra deals last quarter thanks to FlowNex. It's like having a 24/7 sales team.",
    avatar: "AK",
  },
  {
    name: "Dr. Sneha Rao",
    company: "HealthFirst Clinic",
    industry: "Healthcare / Clinic",
    rating: 5,
    date: "2026-04-05",
    text: "Patients love the instant appointment booking on WhatsApp. No more missed calls during consultations. Our no-show rate dropped by 25%.",
    avatar: "SR",
  },
  {
    name: "Vikram Singh",
    company: "Excel Coaching Center",
    industry: "Coaching Institute",
    rating: 5,
    date: "2026-05-01",
    text: "During admission season, FlowNex handled 500+ inquiries per month without us lifting a finger. Enrollments increased by 40%.",
    avatar: "VS",
  },
  {
    name: "Meera Joshi",
    company: "StayEase Hotels",
    industry: "Hotel & Hospitality",
    rating: 4,
    date: "2026-02-18",
    text: "International guests now get instant responses regardless of timezone. Direct bookings increased by 60%, saving us heavily on OTA commissions.",
    avatar: "MJ",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Growing Businesses
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real feedback from businesses using FlowNex to automate their WhatsApp communications.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">4.8/5</span>
            <span className="text-sm text-gray-500">from 127+ reviews</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-all"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
                {Array.from({ length: 5 - t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-gray-200" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-5">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.company} · {t.industry}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
