export const ROLES = ["member", "approver", "admin"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return value === "member" || value === "approver" || value === "admin";
}

export function canReview(role: Role): boolean {
  return role === "approver" || role === "admin";
}

export function canAdmin(role: Role): boolean {
  return role === "admin";
}
