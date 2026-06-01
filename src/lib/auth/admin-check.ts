/**
 * Super Admin Check
 *
 * Hardcoded super admin email for security.
 * Server-side only — never expose this logic to the client.
 */

const SUPER_ADMIN_EMAILS = [
  "shivam95ku@gmail.com",
];

/**
 * Check if a user email is a super admin.
 * Used by API routes and middleware.
 */
export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
