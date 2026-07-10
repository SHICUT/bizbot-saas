import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import RouteLoader from "@/components/ui/RouteLoader";
import { OrganizationSchema, SoftwareApplicationSchema, PersonSchema } from "@/components/marketing/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FlowNex — AI-Powered WhatsApp Automation by Circle Creation",
    template: "%s | FlowNex by Circle Creation",
  },
  description:
    "FlowNex is an AI-powered WhatsApp automation platform by Circle Creation. Capture leads, reply instantly, book appointments, and grow your business. Founded by Shivam Kumar.",
  keywords: [
    "FlowNex",
    "Circle Creation",
    "AI WhatsApp Automation",
    "Founder Shivam Kumar",
    "WhatsApp CRM",
    "Lead Automation Platform",
    "WhatsApp Business API",
    "AI Chatbot",
    "Lead Capture",
    "Appointment Booking",
    "Customer Engagement",
    "WhatsApp Marketing",
  ],
  authors: [{ name: "Shivam Kumar", url: "https://flownex.in/about" }],
  creator: "Circle Creation",
  publisher: "Circle Creation",
  metadataBase: new URL("https://flownex.in"),
  alternates: {
    canonical: "https://flownex.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://flownex.in",
    siteName: "FlowNex",
    title: "FlowNex — AI-Powered WhatsApp Automation by Circle Creation",
    description:
      "FlowNex is an AI-powered WhatsApp automation platform developed by Circle Creation. Capture leads, reply instantly, book appointments automatically.",
    images: [
      {
        url: "/brand/logo-full.png",
        width: 1200,
        height: 630,
        alt: "FlowNex by Circle Creation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowNex — AI WhatsApp Automation by Circle Creation",
    description:
      "AI-powered WhatsApp automation platform by Circle Creation. Founded by Shivam Kumar.",
    images: ["/brand/logo-full.png"],
    creator: "@circlecreation",
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
