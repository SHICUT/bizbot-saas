"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, MessageSquare, Bot, Calendar, X,
  CreditCard, BarChart2, Settings, FlaskConical, BookOpen,
  Megaphone, Image, HelpCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Automation", href: "/automations", icon: Bot },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Broadcasts", href: "/broadcasts", icon: Megaphone },
  { name: "Media", href: "/media", icon: Image },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Simulator", href: "/simulator", icon: FlaskConical },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Help", href: "/help", icon: HelpCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-text-secondary" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation — scrollable */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overscroll-contain">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={onClose} className={cn("sidebar-link", isActive && "active")}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
