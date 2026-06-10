"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Menu, Loader2, LogOut, Settings, CreditCard, ChevronDown } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { logout } from "@/lib/auth/actions";
import { useToast } from "@/components/ui/Toast";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserName(data.user.name || "User");
        if (data.business) {
          setUserPlan(data.business.plan || "trial");
          setBusinessName(data.business.name || "");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-text-secondary" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        {/* Workspace Name */}
        {businessName && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{businessName}</span>
            <span className="text-[10px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full capitalize">{userPlan}</span>
          </div>
        )}

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-56 lg:w-72 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search leads, conversations..." className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full" />
          <kbd className="hidden lg:inline text-[10px] text-text-muted bg-white border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-50 text-text-muted hover:text-text-secondary transition-colors" aria-label="Notifications">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar name={userName || "U"} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-[13px] font-medium text-text-primary leading-tight">{userName || "..."}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden md:block" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-border shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-text-primary">{userName}</p>
                  <p className="text-xs text-text-muted capitalize">{userPlan} Plan</p>
                </div>
                <a href="/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4" />Settings
                </a>
                <a href="/billing" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                  <CreditCard className="w-4 h-4" />Billing
                </a>
                <hr className="my-1 border-border" />
                <button
                  onClick={async () => { setLoggingOut(true); showToast("info", "Logging out..."); try { await logout(); } catch {} }}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
