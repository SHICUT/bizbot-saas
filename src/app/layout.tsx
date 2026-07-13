import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import RouteLoader from "@/components/ui/RouteLoader";
import { OrganizationSchema, SoftwareApplicationSchema, PersonSchema, WebSiteSchema } from "@/components/marketing/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FlowNex - AI Powered Lead Capture & Customer Automation Platform",
    template: "%s | FlowNex by Circle Creation",
  },
  description:
    "FlowNex by Circle Creation helps businesses automate WhatsApp conversations, capture leads instantly, book appointments, and improve customer engagement using AI. Founded by Shivam Kumar.",
  keywords: [
    "AI customer automation",
    "WhatsApp automation",
    "AI lead capture",
    "appointment booking software",
    "customer engagement platform",
    "real estate automation",
    "business automation software",
    "FlowNex",
    "Circle Creation",
    "Shivam Kumar",
    "WhatsApp CRM",
    "WhatsApp Business API",
    "AI Chatbot",
    "lead management",
  ],
  authors: [{ name: "Shivam Kumar", url: "https://www.flownex.in/founder" }],
  creator: "Circle Creation",
  publisher: "Circle Creation",
  metadataBase: new URL("https://www.flownex.in"),
  alternates: {
    canonical: "https://www.flownex.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.flownex.in",
    siteName: "FlowNex by Circle Creation",
    title: "FlowNex by Circle Creation — AI Customer Automation Platform",
    description:
      "AI-powered customer automation platform helping businesses automate WhatsApp conversations, capture leads instantly, and book appointments. Built by Circle Creation, founded by Shivam Kumar.",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "FlowNex by Circle Creation — AI Customer Automation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowNex by Circle Creation",
    description:
      "AI-powered customer automation platform helping businesses automate WhatsApp conversations, capture leads instantly, and book appointments.",
    images: ["/brand/og-image.png"],
    creator: "@circlecreation",
    site: "@flownex",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <PersonSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <RouteLoader />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
