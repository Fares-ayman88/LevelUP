import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createStudentAccessCode, normalizeStudentAccessCode } from "./crypto";

describe("student access codes", () => {
  it("creates a high-entropy, readable access code", () => {
    expect(createStudentAccessCode()).toMatch(/^STU-(?:[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-){3}[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("normalizes spaces and underscores before sign-in", () => {
    expect(normalizeStudentAccessCode(" stu_abcd efgh_ijkl mnpr ")).toBe("STU-ABCD-EFGH-IJKL-MNPR");
  });
});
