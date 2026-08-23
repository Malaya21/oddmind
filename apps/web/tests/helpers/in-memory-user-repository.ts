import type { UserRepository } from "@/repositories/UserRepository";
import type { User } from "@/types";
import type { StatsDelta } from "@/types/scoring";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async upsertUser(user: User): Promise<void> {
    this.users.set(user.uid, structuredClone(user));
  }

  async getUser(uid: string): Promise<User | null> {
    const user = this.users.get(uid);
    return user ? structuredClone(user) : null;
  }

  async updateStats(uid: string, delta: StatsDelta): Promise<void> {
    const user = this.users.get(uid);
    if (!user) {
      return;
    }

    user.stats = {
      gamesPlayed: (user.stats?.gamesPlayed ?? 0) + (delta.gamesPlayed ?? 0),
      gamesWon: (user.stats?.gamesWon ?? 0) + (delta.gamesWon ?? 0),
      totalScore: (user.stats?.totalScore ?? 0) + (delta.totalScore ?? 0),
    };
    this.users.set(uid, user);
  }

  clear(): void {
    this.users.clear();
  }
}
