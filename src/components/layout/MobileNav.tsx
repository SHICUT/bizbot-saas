"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bot,
  Calendar,
  X,
  CreditCard,
  BarChart2,
  Settings,
  FlaskConical,
  BookOpen,
  Megaphone,
  Image,
  HelpCircle,
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
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-text-secondary"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
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
                onClick={onClose}
                className={cn("sidebar-link", isActive && "active")}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
