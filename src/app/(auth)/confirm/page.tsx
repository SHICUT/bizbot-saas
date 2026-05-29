import { Zap, Mail } from "lucide-react";
import Link from "next/link";

/**
 * Email Confirmation Page
 * Shown after registration when email confirmation is enabled.
 */
export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Check your email
        </h1>
        <p className="text-text-secondary mb-6">
          We&apos;ve sent a confirmation link to your email address. Click the
          link to activate your account.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            💡 Can&apos;t find it? Check your spam folder. The email comes from
            noreply@supabase.io
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <Zap className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
