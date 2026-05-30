"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Check onboarding status on dashboard load
    console.log("[Dashboard] Checking onboarding status...");
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        console.log("[Dashboard] Onboarding response:", {
          onboarding_completed: data.onboarding_completed,
          current_step: data.current_step,
          has_business: !!data.business,
        });

        if (!data.onboarding_completed) {
          console.log("[Dashboard] Onboarding not completed. Redirecting to /onboarding");
          window.location.assign("/onboarding");
          return;
        }
        setChecking(false);
      })
      .catch((err) => {
        console.error("[Dashboard] Onboarding check failed:", err);
        // Allow access on error (don't block if API fails)
        setChecking(false);
      });
  }, [pathname]);

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
