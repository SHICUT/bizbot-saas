export default function CustomerLogos() {
  const businesses = [
    "FitZone Gym",
    "Prime Realty",
    "Excel Academy",
    "HealthFirst Clinic",
    "Glow Studio",
    "StayEase Hotels",
    "FreshBite",
    "AutoCare Service",
  ];

  return (
    <section className="py-12 bg-gray-50/50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-500 mb-8 uppercase tracking-wider">
          Trusted by Growing Businesses
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {businesses.map((name) => (
            <div
              key={name}
              className="px-5 py-3 bg-white border border-gray-100 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 hover:border-gray-200 transition-all"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
