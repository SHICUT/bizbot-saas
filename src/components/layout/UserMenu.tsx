"use client";

import { useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { logout } from "@/lib/auth/actions";

interface UserMenuProps {
  name: string;
  email: string;
  plan?: string;
}

export default function UserMenu({ name, email, plan = "Starter" }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50"
      >
        <Avatar name={name} size="sm" />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-text-primary leading-tight">
            {name.split(" ")[0]}
          </p>
          <p className="text-xs text-text-muted leading-tight">{plan} Plan</p>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-50 py-2">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-text-primary">{name}</p>
              <p className="text-xs text-text-muted">{email}</p>
            </div>

            <div className="py-1">
              <a
                href="/settings"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 hover:text-text-primary"
              >
                <User className="w-4 h-4" />
                Profile
              </a>
              <a
                href="/billing"
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 hover:text-text-primary"
              >
                <Settings className="w-4 h-4" />
                Billing
              </a>
            </div>

            <div className="border-t border-border pt-1">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
