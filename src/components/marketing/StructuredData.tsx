export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.flownex.in/#organization",
    name: "Circle Creation",
    url: "https://www.flownex.in",
    logo: {
      "@type": "ImageObject",
      url: "https://www.flownex.in/brand/logo-full.png",
      width: 400,
      height: 100,
    },
    brand: {
      "@type": "Brand",
      name: "FlowNex",
      description: "AI Customer Automation Platform",
    },
    founder: {
      "@type": "Person",
      "@id": "https://www.flownex.in/#founder",
      name: "Shivam Kumar",
      jobTitle: "Founder & CEO",
      url: "https://www.flownex.in/founder",
    },
    description:
      "FlowNex is an AI-powered customer automation platform developed by Circle Creation. It helps businesses automate WhatsApp conversations, capture leads, book appointments, and improve customer engagement.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "shivam95ku@gmail.com",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [
      "https://twitter.com/circlecreation",
      "https://linkedin.com/company/circlecreation",
      "https://instagram.com/circlecreation",
      "https://facebook.com/circlecreation",
      "https://github.com/circlecreation",
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
    "@id": "https://www.flownex.in/#software",
    name: "FlowNex",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered customer automation platform for lead capture, WhatsApp automation, appointment booking, and customer engagement.",
    url: "https://www.flownex.in",
    author: {
      "@type": "Organization",
      name: "Circle Creation",
      url: "https://www.flownex.in",
    },
    creator: {
      "@type": "Person",
      name: "Shivam Kumar",
      jobTitle: "Founder & CEO",
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
    "@id": "https://www.flownex.in/#founder",
    name: "Shivam Kumar",
    jobTitle: "Founder & CEO",
    url: "https://www.flownex.in/founder",
    worksFor: {
      "@type": "Organization",
      name: "Circle Creation",
      url: "https://www.flownex.in",
    },
    foundedOrganization: {
      "@type": "Organization",
      name: "Circle Creation",
    },
    description:
      "Shivam Kumar is the Founder & CEO of FlowNex and Circle Creation. He built FlowNex as an AI-powered customer automation platform to help businesses automate WhatsApp conversations and capture leads.",
    knowsAbout: [
      "AI Automation",
      "WhatsApp Business API",
      "SaaS Development",
      "Customer Engagement",
      "Lead Generation",
    ],
    sameAs: [
      "https://twitter.com/circlecreation",
      "https://linkedin.com/in/shivamkumar",
      "https://instagram.com/circlecreation",
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

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.flownex.in/#website",
    name: "FlowNex",
    alternateName: "FlowNex by Circle Creation",
    url: "https://www.flownex.in",
    description:
      "FlowNex is an AI-powered customer automation platform by Circle Creation that helps businesses automate WhatsApp conversations, capture leads, and book appointments.",
    publisher: {
      "@type": "Organization",
      "@id": "https://www.flownex.in/#organization",
      name: "Circle Creation",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.flownex.in/blog?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  image,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    image: image || "https://www.flownex.in/brand/og-image.png",
    author: {
      "@type": "Person",
      "@id": "https://www.flownex.in/#founder",
      name: "Shivam Kumar",
      url: "https://www.flownex.in/founder",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://www.flownex.in/#organization",
      name: "Circle Creation",
      logo: {
        "@type": "ImageObject",
        url: "https://www.flownex.in/brand/logo-full.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
