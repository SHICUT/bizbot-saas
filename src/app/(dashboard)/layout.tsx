"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";
import FloatingSupport from "@/components/support/FloatingSupport";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log("[Dashboard] Checking onboarding status...");

    fetch("/api/onboarding")
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const hasCompletedOnboarding = data.onboarding_completed === true;
        const businessExists = !!data.business;
        const businessType = data.business?.type;

        console.log("[Dashboard] Check result:", {
          onboarding_completed: data.onboarding_completed,
          businessExists,
          businessType,
          decision: hasCompletedOnboarding ? "ALLOW" : "REDIRECT TO ONBOARDING",
        });

        // STRICT CHECK: Only allow dashboard if onboarding is explicitly completed
        if (!hasCompletedOnboarding) {
          console.log("[Dashboard] Onboarding NOT completed. Redirecting...");
          window.location.assign("/onboarding");
          return;
        }

        // Onboarding completed — allow dashboard
        setChecking(false);
      })
      .catch((err) => {
        console.error("[Dashboard] Onboarding check error:", err.message);
        // On API error, allow access (don't trap user)
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px]">{children}</main>
      </div>
      <FloatingSupport />
    </div>
  );
}
