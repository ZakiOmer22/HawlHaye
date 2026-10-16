import { describe, expect, it } from "vitest";
import { canTransition, formatTaskCode, isOverdue, transitionSchema } from "./index";

const dean = { id: "u1", role: "DEAN" as const };
const coord = { id: "u2", role: "FACULTY_COORDINATOR" as const };
const tech = { id: "u3", role: "LAB_TECHNICIAN" as const };
const task = (status: Parameters<typeof canTransition>[1]["status"]) => ({
  status,
  ownerId: "u2",
  delegateId: "u3",
});

describe("workflow", () => {
  it("only leadership assigns", () => {
    expect(canTransition(dean, task("UNASSIGNED"), "ASSIGNED").ok).toBe(true);
    expect(canTransition(coord, task("UNASSIGNED"), "ASSIGNED").ok).toBe(false);
  });
  it("only leadership accepts from review", () => {
    expect(canTransition(dean, task("REVIEW"), "COMPLETED").ok).toBe(true);
    expect(canTransition(coord, task("REVIEW"), "COMPLETED").ok).toBe(false);
  });
  it("owner submits to review, delegate cannot", () => {
    expect(canTransition(coord, task("IN_PROGRESS"), "REVIEW").ok).toBe(true);
    expect(canTransition(tech, task("IN_PROGRESS"), "REVIEW").ok).toBe(false);
  });
  it("delegate can start and block work", () => {
    expect(canTransition(tech, task("ASSIGNED"), "IN_PROGRESS").ok).toBe(true);
    expect(canTransition(tech, task("IN_PROGRESS"), "BLOCKED").ok).toBe(true);
  });
  it("rejects illegal jumps", () => {
    expect(canTransition(dean, task("UNASSIGNED"), "COMPLETED").ok).toBe(false);
  });
  it("blocking requires a reason", () => {
    expect(transitionSchema.safeParse({ to: "BLOCKED" }).success).toBe(false);
    expect(transitionSchema.safeParse({ to: "BLOCKED", reason: "Waiting for parts" }).success).toBe(
      true,
    );
  });
});

describe("helpers", () => {
  it("formats task codes", () => {
    expect(formatTaskCode(2026, 1)).toBe("CECIT-2026-001");
    expect(formatTaskCode(2026, 123)).toBe("CECIT-2026-123");
  });
  it("flags overdue only for open tasks", () => {
    const past = new Date("2020-01-01");
    expect(isOverdue(past, "IN_PROGRESS")).toBe(true);
    expect(isOverdue(past, "COMPLETED")).toBe(false);
    expect(isOverdue(null, "ASSIGNED")).toBe(false);
  });
});
