import type { User } from "@/types";
import type { UserRepository } from "@/repositories/UserRepository";
import { generateDisplayName } from "@/domain/player/DisplayNameGenerator";
import { validateDisplayName } from "@/domain/player/DisplayNameValidator";

export interface UserService {
  ensureUser(uid: string): Promise<User>;
  getUser(uid: string): Promise<User | null>;
  updateDisplayName(uid: string, displayName: string): Promise<User>;
  regenerateDisplayName(uid: string): Promise<User>;
}

export class UserServiceImpl implements UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async ensureUser(uid: string): Promise<User> {
    const existing = await this.userRepository.getUser(uid);
    const now = new Date().toISOString();

    if (existing) {
      const updated: User = {
        ...existing,
        lastSeenAt: now,
      };
      await this.userRepository.upsertUser(updated);
      return updated;
    }

    const created: User = {
      uid,
      displayName: generateDisplayName(),
      createdAt: now,
      lastSeenAt: now,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      },
    };

    await this.userRepository.upsertUser(created);
    return created;
  }

  async getUser(uid: string): Promise<User | null> {
    return this.userRepository.getUser(uid);
  }

  async updateDisplayName(uid: string, displayName: string): Promise<User> {
    const validated = validateDisplayName(displayName);
    const existing = await this.userRepository.getUser(uid);

    if (!existing) {
      return this.ensureUser(uid).then(async (user) => {
        const updated: User = {
          ...user,
          displayName: validated,
          lastSeenAt: new Date().toISOString(),
        };
        await this.userRepository.upsertUser(updated);
        return updated;
      });
    }

    const updated: User = {
      ...existing,
      displayName: validated,
      lastSeenAt: new Date().toISOString(),
    };
    await this.userRepository.upsertUser(updated);
    return updated;
  }

  async regenerateDisplayName(uid: string): Promise<User> {
    return this.updateDisplayName(uid, generateDisplayName());
  }
}
