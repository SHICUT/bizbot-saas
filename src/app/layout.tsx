import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import RouteLoader from "@/components/ui/RouteLoader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowNex — AI-Powered Lead Capture & Customer Automation",
  description: "Capture leads automatically, reply instantly on WhatsApp, book appointments, and grow your business with AI-powered automation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <ToastProvider>
          <RouteLoader />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
