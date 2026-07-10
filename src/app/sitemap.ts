import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://flownex.in";

  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/welcome`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ownership`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/developer`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/case-studies`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-06-01"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date("2026-06-01"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date("2026-07-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
