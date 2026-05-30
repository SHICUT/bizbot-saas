"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Only check once on mount, not on every pathname change
    console.log("[Dashboard Layout] Checking onboarding...");

    fetch("/api/onboarding")
      .then((r) => {
        console.log("[Dashboard Layout] API response status:", r.status);
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then((data) => {
        console.log("[Dashboard Layout] API data:", JSON.stringify({
          onboarding_completed: data.onboarding_completed,
          has_business: !!data.business,
          business_name: data.business?.name,
        }));

        // If business exists AND has a type set, consider onboarding done
        // This is the fallback check in case onboarding_completed wasn't saved
        const isCompleted = data.onboarding_completed === true ||
          (data.business && data.business.type && data.business.type !== "other");

        if (!isCompleted && !data.business) {
          // No business at all — definitely needs onboarding
          console.log("[Dashboard Layout] No business found. Redirecting to onboarding.");
          window.location.assign("/onboarding");
          return;
        }

        // Business exists — allow dashboard access
        console.log("[Dashboard Layout] Access granted. onboarding_completed:", data.onboarding_completed);
        setChecking(false);
      })
      .catch((err) => {
        console.error("[Dashboard Layout] Check failed:", err.message);
        // On error, allow dashboard access (don't trap user in loop)
        setChecking(false);
      });
  }, []); // Only run ONCE on mount

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
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
