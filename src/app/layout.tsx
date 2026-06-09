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
  title: "FlowNex AI — WhatsApp Automation for Business",
  description: "AI-powered WhatsApp automation platform for Indian small businesses. Auto-reply, capture leads, book appointments automatically.",
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
