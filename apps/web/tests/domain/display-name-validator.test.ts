import { describe, expect, it } from "vitest";
import {
  isValidDisplayName,
  normalizeDisplayName,
  validateDisplayName,
} from "@/domain/player/DisplayNameValidator";
import { ValidationError } from "@/lib/errors";

describe("DisplayNameValidator", () => {
  it("accepts valid two-word names", () => {
    expect(validateDisplayName("Blue Falcon")).toBe("Blue Falcon");
  });

  it("normalizes extra whitespace", () => {
    expect(normalizeDisplayName("  Blue   Falcon  ")).toBe("Blue Falcon");
  });

  it("rejects names that are too short", () => {
    expect(() => validateDisplayName("Ab")).toThrow(ValidationError);
  });

  it("rejects names that are too long", () => {
    expect(() => validateDisplayName("A".repeat(25))).toThrow(ValidationError);
  });

  it("rejects invalid characters", () => {
    expect(() => validateDisplayName("Blue_Falcon")).toThrow(ValidationError);
    expect(isValidDisplayName("Blue_Falcon")).toBe(false);
  });

  it("rejects blocked reserved names", () => {
    expect(() => validateDisplayName("Admin")).toThrow(ValidationError);
  });

  it("rejects more than one space (three-word names)", () => {
    expect(() => validateDisplayName("Blue Silent Fox")).toThrow(ValidationError);
  });
});
