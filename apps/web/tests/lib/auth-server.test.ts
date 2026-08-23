import { describe, expect, it } from "vitest";
import { verifyIdToken } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/errors";

describe("verifyIdToken", () => {
  it("rejects missing authorization header", async () => {
    await expect(verifyIdToken(null)).rejects.toThrow(UnauthorizedError);
  });

  it("rejects malformed authorization header", async () => {
    await expect(verifyIdToken("Token abc")).rejects.toThrow(UnauthorizedError);
  });

  it("rejects empty bearer token", async () => {
    await expect(verifyIdToken("Bearer ")).rejects.toThrow(UnauthorizedError);
  });
});
