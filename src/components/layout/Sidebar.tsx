"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, MessageSquare, Bot, Calendar,
  CreditCard, BarChart2, Settings, Zap, FlaskConical,
  Shield, Image, BookOpen, Megaphone, HelpCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Broadcasts", href: "/broadcasts", icon: Megaphone },
  { name: "Automations", href: "/automations", icon: Bot },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Media", href: "/media", icon: Image },
  { name: "Simulator", href: "/simulator", icon: FlaskConical },
  { name: "Revenue", href: "/analytics", icon: BarChart2 },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
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
    <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-base font-bold text-text-primary tracking-tight">BizBot</span>
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className={cn("sidebar-link", isActive && "active")}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Usage + Status */}
      <div className="px-3 py-3 border-t border-border space-y-3">
        {/* WhatsApp Status */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${usage.waConnected ? "bg-emerald-500" : "bg-gray-400"}`} />
          <span className="text-[11px] text-text-secondary font-medium">{usage.waConnected ? "WhatsApp Live" : "WhatsApp Off"}</span>
        </div>

        {/* Plan Usage */}
        <div className="px-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{usage.plan} Plan</span>
            <span className="text-[10px] text-text-muted">{usage.used}/{usage.limit} AI</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className={`h-1.5 rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        {/* Admin + Settings */}
        {isAdmin && (
          <Link href="/admin" className={cn("sidebar-link", pathname === "/admin" && "active")}>
            <Shield className="w-4 h-4 flex-shrink-0" />Admin
          </Link>
        )}
        <Link href="/settings" className={cn("sidebar-link", pathname === "/settings" && "active")}>
          <Settings className="w-4 h-4 flex-shrink-0" />Settings
        </Link>
      </div>
    </aside>
  );
}
