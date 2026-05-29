"use client";

import { Bell, Search, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-text-secondary"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-background rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search leads, messages..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full"
          />
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">
            WhatsApp Connected
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 text-text-secondary"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50">
          <Avatar name="Rahul Sharma" size="sm" />
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-text-primary leading-tight">
              Rahul S.
            </p>
            <p className="text-xs text-text-muted leading-tight">
              Starter Plan
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
