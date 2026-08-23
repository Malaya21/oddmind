import { beforeEach, describe, expect, it } from "vitest";
import { UserServiceImpl } from "@/services/UserService";
import { InMemoryUserRepository } from "../helpers/in-memory-user-repository";
import { ValidationError } from "@/lib/errors";

describe("UserService", () => {
  let repository: InMemoryUserRepository;
  let service: UserServiceImpl;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    service = new UserServiceImpl(repository);
  });

  it("creates a profile on first visit", async () => {
    const user = await service.ensureUser("uid-1");

    expect(user.uid).toBe("uid-1");
    expect(user.displayName).toBeTruthy();
    expect(user.createdAt).toBeTruthy();
    expect(user.lastSeenAt).toBeTruthy();
  });

  it("returns stable profile on subsequent loads", async () => {
    const first = await service.ensureUser("uid-1");
    const second = await service.ensureUser("uid-1");

    expect(second.uid).toBe(first.uid);
    expect(second.displayName).toBe(first.displayName);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it("updates display name with validation", async () => {
    await service.ensureUser("uid-1");
    const updated = await service.updateDisplayName("uid-1", "Silent Fox");

    expect(updated.displayName).toBe("Silent Fox");
  });

  it("rejects invalid display names", async () => {
    await service.ensureUser("uid-1");

    await expect(service.updateDisplayName("uid-1", "!!")).rejects.toThrow(
      ValidationError,
    );
  });

  it("regenerates display name", async () => {
    await service.ensureUser("uid-1");
    const regenerated = await service.regenerateDisplayName("uid-1");

    expect(regenerated.displayName).toMatch(/^[A-Za-z]+ [A-Za-z]+$/);
  });

  it("retrieves profile by uid", async () => {
    await service.ensureUser("uid-42");
    const user = await service.getUser("uid-42");

    expect(user?.uid).toBe("uid-42");
  });
});
