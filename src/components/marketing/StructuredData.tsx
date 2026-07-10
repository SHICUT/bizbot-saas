export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Circle Creation",
    url: "https://flownex.in",
    logo: "https://flownex.in/brand/logo-full.png",
    brand: {
      "@type": "Brand",
      name: "FlowNex",
    },
    founder: {
      "@type": "Person",
      name: "Shivam Kumar",
      jobTitle: "Founder & CEO",
    },
    description:
      "Circle Creation is a technology company that develops FlowNex, an AI-powered WhatsApp automation platform for lead management, appointment booking, and customer engagement.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "shivam95ku@gmail.com",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [
      "https://twitter.com/circlecreation",
      "https://linkedin.com/company/circlecreation",
      "https://wa.me/919572495969",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FlowNex",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered WhatsApp automation platform for lead management, appointment booking, and customer engagement.",
    url: "https://flownex.in",
    author: {
      "@type": "Organization",
      name: "Circle Creation",
    },
    creator: {
      "@type": "Person",
      name: "Shivam Kumar",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "19",
      highPrice: "99",
      priceCurrency: "USD",
      offerCount: "3",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function PersonSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Shivam Kumar",
    jobTitle: "Founder & CEO",
    worksFor: {
      "@type": "Organization",
      name: "Circle Creation",
    },
    description:
      "Founder of Circle Creation and Creator of FlowNex — an AI-powered WhatsApp automation platform.",
    sameAs: [
      "https://twitter.com/circlecreation",
      "https://linkedin.com/company/circlecreation",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function AggregateRatingSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "FlowNex",
    brand: {
      "@type": "Brand",
      name: "Circle Creation",
    },
    description:
      "AI-powered WhatsApp automation platform for lead management, appointment booking, and customer engagement.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Rahul Sharma" },
        datePublished: "2026-05-15",
        reviewBody:
          "FlowNex handles 90% of my inquiries automatically. I went from missing leads to booking 3x more trial sessions.",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Priya Mehta" },
        datePublished: "2026-04-22",
        reviewBody:
          "My customers get instant replies even at midnight. Appointment bookings doubled in the first month.",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Amit Kapoor" },
        datePublished: "2026-03-10",
        reviewBody:
          "Every property inquiry is now captured and followed up. I closed 4 extra deals last quarter.",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema() {
  const faqs = [
    {
      question: "How does FlowNex connect to my WhatsApp?",
      answer:
        "FlowNex uses the official WhatsApp Business API (Meta-approved). You connect your business number through our simple setup wizard — no technical skills needed.",
    },
    {
      question: "Will customers know they're talking to AI?",
      answer:
        "No. FlowNex responds like a real human team member. It uses your business knowledge, tone, and language to craft natural conversations.",
    },
    {
      question: "What happens when the AI can't answer?",
      answer:
        "FlowNex seamlessly hands off to you or your team. You get notified instantly and can take over any conversation at any time.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes! 7-day free trial with 100 AI replies. No credit card required. Start in under 5 minutes.",
    },
    {
      question: "Which business types does FlowNex support?",
      answer:
        "Gyms, salons, clinics, restaurants, real estate, coaching centers, and any service-based business. The AI adapts to your specific industry.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
