"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bot,
  Calendar,
  CreditCard,
  BarChart2,
  Settings,
  Zap,
  FlaskConical,
  Shield,
  Image,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Automations", href: "/automations", icon: Bot },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Media", href: "/media", icon: Image },
  { name: "Simulator", href: "/simulator", icon: FlaskConical },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/check-role").then((r) => r.json()).then((d) => {
      if (d.role === "super_admin") setIsAdmin(true);
    }).catch(() => {});
  }, []);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-lg font-bold text-text-primary">BizBot</span>
        <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border">
        {isAdmin && (
          <Link href="/admin" className={cn("sidebar-link mb-1", pathname === "/admin" && "active")}>
            <Shield className="w-5 h-5 flex-shrink-0" />
            Admin Panel
          </Link>
        )}
        <Link href="/settings" className="sidebar-link">
          <Settings className="w-5 h-5 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
