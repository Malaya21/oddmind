import { describe, expect, it } from "vitest";
import { generateDisplayName } from "@/domain/player/DisplayNameGenerator";

describe("DisplayNameGenerator", () => {
  it("generates adjective-animal names", () => {
    const name = generateDisplayName();
    expect(name.split(" ")).toHaveLength(2);
    expect(name.length).toBeGreaterThanOrEqual(3);
  });
});
