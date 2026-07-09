/**
 * Role-Based Access Control (RBAC)
 *
 * Roles: owner, manager, sales_head, sales, telecaller, support
 * Permissions are checked via hasPermission(role, action)
 *
 * Architecture:
 * - Permissions matrix defined here (single source of truth)
 * - Middleware function for API routes
 * - Hook for frontend conditional rendering
 */

export type Role = "owner" | "manager" | "sales_head" | "sales" | "telecaller" | "support";

export type Permission =
  | "team:manage"
  | "team:view"
  | "leads:view_all"
  | "leads:view_assigned"
  | "leads:create"
  | "leads:update"
  | "leads:assign"
  | "leads:delete"
  | "properties:manage"
  | "properties:view"
  | "appointments:create"
  | "appointments:view_all"
  | "appointments:view_assigned"
  | "conversations:view_all"
  | "conversations:view_assigned"
  | "conversations:reply"
  | "analytics:view"
  | "analytics:export"
  | "billing:manage"
  | "settings:manage"
  | "notifications:view"
  | "pipeline:manage"
  | "pipeline:move_leads"
  | "notes:create"
  | "notes:view";

// ─── Permissions Matrix ─────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "team:manage", "team:view",
    "leads:view_all", "leads:create", "leads:update", "leads:assign", "leads:delete",
    "properties:manage", "properties:view",
    "appointments:create", "appointments:view_all",
    "conversations:view_all", "conversations:reply",
    "analytics:view", "analytics:export",
    "billing:manage", "settings:manage",
    "notifications:view",
    "pipeline:manage", "pipeline:move_leads",
    "notes:create", "notes:view",
  ],
  manager: [
    "team:view",
    "leads:view_all", "leads:create", "leads:update", "leads:assign",
    "properties:view",
    "appointments:create", "appointments:view_all",
    "conversations:view_all", "conversations:reply",
    "analytics:view",
    "notifications:view",
    "pipeline:manage", "pipeline:move_leads",
    "notes:create", "notes:view",
  ],
  sales_head: [
    "team:view",
    "leads:view_all", "leads:create", "leads:update", "leads:assign",
    "properties:view",
    "appointments:create", "appointments:view_all",
    "conversations:view_all", "conversations:reply",
    "analytics:view",
    "notifications:view",
    "pipeline:move_leads",
    "notes:create", "notes:view",
  ],
  sales: [
    "leads:view_assigned", "leads:create", "leads:update",
    "properties:view",
    "appointments:create", "appointments:view_assigned",
    "conversations:view_assigned", "conversations:reply",
    "notifications:view",
    "pipeline:move_leads",
    "notes:create", "notes:view",
  ],
  telecaller: [
    "leads:view_assigned", "leads:update",
    "appointments:create", "appointments:view_assigned",
    "conversations:view_assigned",
    "notifications:view",
    "pipeline:move_leads",
    "notes:create", "notes:view",
  ],
  support: [
    "leads:view_assigned",
    "conversations:view_assigned", "conversations:reply",
    "notifications:view",
    "notes:create", "notes:view",
  ],
};

// ─── Public API ─────────────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/** Get all permissions for a role */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/** Get all available roles (for dropdowns) */
export function getAllRoles(): Array<{ value: Role; label: string; description: string }> {
  return [
    { value: "owner", label: "Owner", description: "Full access to everything" },
    { value: "manager", label: "Manager", description: "Team management, all leads, analytics" },
    { value: "sales_head", label: "Sales Head", description: "All leads, assignments, analytics" },
    { value: "sales", label: "Sales Executive", description: "Assigned leads, bookings, notes" },
    { value: "telecaller", label: "Telecaller", description: "Call leads, follow-ups, schedule visits" },
    { value: "support", label: "Support", description: "View conversations, limited access" },
  ];
}

/** Check if role is at least as powerful as another */
export function isRoleAtLeast(role: Role, minimum: Role): boolean {
  const hierarchy: Role[] = ["owner", "manager", "sales_head", "sales", "telecaller", "support"];
  return hierarchy.indexOf(role) <= hierarchy.indexOf(minimum);
}
