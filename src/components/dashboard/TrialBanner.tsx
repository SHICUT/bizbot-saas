"use client";

import { Zap, Clock } from "lucide-react";
import Button from "@/components/ui/Button";

interface TrialBannerProps {
  plan: string;
  status: string;
  trialEnd: string | null;
  messagesUsed: number;
  messageLimit: number;
}

export default function TrialBanner({ plan, status, trialEnd, messagesUsed, messageLimit }: TrialBannerProps) {
  if (status === "active" && plan !== "trial") return null; // Paid user, no banner

  const now = new Date();
  const end = trialEnd ? new Date(trialEnd) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const isExpired = end ? end < now : false;

  if (isExpired) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Your free trial has expired</p>
            <p className="text-xs text-red-600">Upgrade to continue using AI auto-replies and lead capture.</p>
          </div>
        </div>
        <a href="/billing">
          <Button size="sm"><Zap className="w-3.5 h-3.5" />Upgrade Now</Button>
        </a>
      </div>
    );
  }

  if (status === "trialing" || plan === "trial") {
    return (
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in your free trial
            </p>
            <p className="text-xs text-amber-600">
              {messagesUsed}/{messageLimit} messages used • Full Starter access
            </p>
          </div>
        </div>
        <a href="/billing">
          <Button variant="secondary" size="sm"><Zap className="w-3.5 h-3.5" />Upgrade</Button>
        </a>
      </div>
    );
  }

  return null;
}
