export const roles = ["student", "guardian", "teacher", "assistant", "center_admin"] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "student.read_own_profile",
  "student.read_available_groups",
  "student.create_booking_request",
  "student.read_own_schedule",
  "student.read_own_progress",
  "student.create_group_switch_request",
  "student.read_own_payment_status",
  "guardian.read_linked_students",
  "guardian.read_linked_schedules",
  "guardian.read_linked_progress",
  "guardian.read_linked_payment_status",
  "teacher.read_assigned_groups",
  "teacher.read_assigned_students",
  "teacher.manage_own_profile",
  "teacher.manage_attendance",
  "teacher.manage_assignments",
  "teacher.manage_exams",
  "assistant.read_center_students",
  "assistant.manage_rosters",
  "assistant.manage_payment_followups",
  "assistant.record_cash_payment",
  "assistant.review_transfer_proof",
  "assistant.manage_waitlists",
  "organization.manage_settings",
  "organization.manage_users",
  "organization.manage_students",
  "organization.manage_groups",
  "organization.read_reporting",
] as const;

export type Permission = (typeof permissions)[number];

const permissionsByRole: Record<Role, readonly Permission[]> = {
  student: [
    "student.read_own_profile",
    "student.read_available_groups",
    "student.create_booking_request",
    "student.read_own_schedule",
    "student.read_own_progress",
    "student.create_group_switch_request",
    "student.read_own_payment_status",
  ],
  guardian: [
    "guardian.read_linked_students",
    "guardian.read_linked_schedules",
    "guardian.read_linked_progress",
    "guardian.read_linked_payment_status",
  ],
  teacher: [
    "teacher.read_assigned_groups",
    "teacher.read_assigned_students",
    "teacher.manage_own_profile",
    "teacher.manage_attendance",
    "teacher.manage_assignments",
    "teacher.manage_exams",
  ],
  assistant: [
    "assistant.read_center_students",
    "assistant.manage_rosters",
    "assistant.manage_payment_followups",
    "assistant.record_cash_payment",
    "assistant.review_transfer_proof",
    "assistant.manage_waitlists",
  ],
  center_admin: [
    "assistant.read_center_students",
    "assistant.manage_rosters",
    "assistant.manage_payment_followups",
    "assistant.record_cash_payment",
    "assistant.review_transfer_proof",
    "assistant.manage_waitlists",
    "organization.manage_settings",
    "organization.manage_users",
    "organization.manage_students",
    "organization.manage_groups",
    "organization.read_reporting",
  ],
};

export type OrganizationPrincipal = {
  userId: string;
  organizationId: string;
  roles: readonly Role[];
  studentProfileId?: string;
  guardianStudentProfileIds?: readonly string[];
  assignedStudentProfileIds?: readonly string[];
};

export class AuthorizationError extends Error {
  constructor(permission: Permission) {
    super(`The current account cannot perform ${permission}.`);
    this.name = "AuthorizationError";
  }
}

export function hasPermission(principal: OrganizationPrincipal, permission: Permission): boolean {
  return principal.roles.some((role) => permissionsByRole[role].includes(permission));
}

export function requirePermission(principal: OrganizationPrincipal, permission: Permission): void {
  if (!hasPermission(principal, permission)) {
    throw new AuthorizationError(permission);
  }
}

export function canAccessStudent(
  principal: OrganizationPrincipal,
  organizationId: string,
  studentProfileId: string,
): boolean {
  if (principal.organizationId !== organizationId) {
    return false;
  }

  if (principal.studentProfileId === studentProfileId) {
    return hasPermission(principal, "student.read_own_profile");
  }

  if (principal.guardianStudentProfileIds?.includes(studentProfileId)) {
    return hasPermission(principal, "guardian.read_linked_students");
  }

  if (principal.assignedStudentProfileIds?.includes(studentProfileId)) {
    return (
      hasPermission(principal, "teacher.read_assigned_students") ||
      hasPermission(principal, "assistant.read_center_students")
    );
  }

  return hasPermission(principal, "organization.manage_students");
}
