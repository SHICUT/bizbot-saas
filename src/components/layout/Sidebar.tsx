"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, MessageSquare, Bot, Calendar, Home,
  CreditCard, BarChart2, Settings, FlaskConical,
  Shield, Image, BookOpen, Megaphone, HelpCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Conversations", href: "/conversations", icon: MessageSquare, badge: true },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Properties", href: "/properties", icon: Home },
  { name: "Automation", href: "/automations", icon: Bot },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Broadcasts", href: "/broadcasts", icon: Megaphone },
  { name: "Media", href: "/media", icon: Image },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Simulator", href: "/simulator", icon: FlaskConical },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [usage, setUsage] = useState({ used: 0, limit: 100, plan: "trial", waConnected: false });

  useEffect(() => {
    fetch("/api/admin/check-role").then((r) => r.json()).then((d) => {
      if (d.role === "super_admin") setIsAdmin(true);
    }).catch(() => {});

    fetch("/api/dashboard").then((r) => r.json()).then((d) => {
      setUsage({
        used: d.stats?.messagesUsed || d.subscription?.messages_used || 0,
        limit: d.stats?.messageLimit || d.subscription?.message_limit || 100,
        plan: d.subscription?.plan || d.business?.plan || "trial",
        waConnected: d.business?.whatsapp_connected || false,
      });
    }).catch(() => {});
  }, []);

  const usagePercent = Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-border transition-all duration-200",
      collapsed ? "lg:w-[68px]" : "lg:w-[260px]"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          {collapsed ? (
            <img src="/brand/logo-icon.png" alt="FlowNex" className="w-8 h-8 object-contain" />
          ) : (
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-border space-y-3">
        {/* WhatsApp Status */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/80">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${usage.waConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-[11px] text-text-secondary font-medium">{usage.waConnected ? "WhatsApp Live" : "WhatsApp Offline"}</span>
          </div>
        )}

        {/* Plan Usage */}
        {!collapsed && (
          <div className="px-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{usage.plan}</span>
              <span className="text-[10px] font-medium text-text-muted">{usage.used}/{usage.limit} AI</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Admin + Settings */}
        {isAdmin && (
          <Link href="/admin" className={cn("sidebar-link", pathname === "/admin" && "active")} title={collapsed ? "Admin" : undefined}>
            <Shield className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
        <Link href="/settings" className={cn("sidebar-link", pathname === "/settings" && "active")} title={collapsed ? "Settings" : undefined}>
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
