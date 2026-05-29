"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { logout } from "@/lib/auth/actions";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserName(data.user.name || "User");
        if (data.business) setUserPlan(data.business.plan || "trial");
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-text-secondary" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-background rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search..." className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-text-secondary" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </button>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50">
            <Avatar name={userName || "U"} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary leading-tight">{userName || "Loading..."}</p>
              <p className="text-xs text-text-muted leading-tight capitalize">{userPlan || "..."} Plan</p>
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-border shadow-lg z-50 py-2">
                <a href="/settings" className="block px-4 py-2 text-sm text-text-secondary hover:bg-gray-50">Settings</a>
                <a href="/billing" className="block px-4 py-2 text-sm text-text-secondary hover:bg-gray-50">Billing</a>
                <hr className="my-1 border-border" />
                <button onClick={() => logout()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
