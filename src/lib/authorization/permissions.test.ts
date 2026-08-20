import { describe, expect, it } from "vitest";

import { canAccessStudent, hasPermission, type OrganizationPrincipal } from "./permissions";

const organizationId = "center-1";

describe("authorization", () => {
  it("keeps student records tenant-scoped", () => {
    const principal: OrganizationPrincipal = {
      userId: "student-user",
      organizationId,
      roles: ["student"],
      studentProfileId: "student-1",
    };

    expect(canAccessStudent(principal, organizationId, "student-1")).toBe(true);
    expect(canAccessStudent(principal, "center-2", "student-1")).toBe(false);
    expect(canAccessStudent(principal, organizationId, "student-2")).toBe(false);
  });

  it("allows guardians to access only linked student profiles", () => {
    const principal: OrganizationPrincipal = {
      userId: "guardian-user",
      organizationId,
      roles: ["guardian"],
      guardianStudentProfileIds: ["student-1", "student-2"],
    };

    expect(canAccessStudent(principal, organizationId, "student-2")).toBe(true);
    expect(canAccessStudent(principal, organizationId, "student-3")).toBe(false);
  });

  it("does not grant payment-review access to teachers", () => {
    const principal: OrganizationPrincipal = {
      userId: "teacher-user",
      organizationId,
      roles: ["teacher"],
    };

    expect(hasPermission(principal, "teacher.manage_attendance")).toBe(true);
    expect(hasPermission(principal, "assistant.review_transfer_proof")).toBe(false);
  });
});
