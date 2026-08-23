import type { User, StatsDelta } from "@/types";

export interface UserRepository {
  upsertUser(user: User): Promise<void>;
  getUser(uid: string): Promise<User | null>;
  updateStats(uid: string, delta: StatsDelta): Promise<void>;
}
