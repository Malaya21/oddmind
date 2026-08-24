import type {
  QuickChallenge,
  PublicQuickChallenge,
  QuickChallengeCategory,
} from "@/types/quick-challenge";
import { SEED_QUICK_CHALLENGES } from "@/server/mindgrid/quick/seed-challenges";

export interface IQuickChallengeRepository {
  getChallenge(id: string): Promise<QuickChallenge | null>;
  getAllChallenges(): Promise<QuickChallenge[]>;
  getChallengesByCategory(category: QuickChallengeCategory): Promise<QuickChallenge[]>;
  getPublicChallenge(id: string): Promise<PublicQuickChallenge | null>;
  getAllPublicChallenges(): Promise<PublicQuickChallenge[]>;
  getQuickPlayChallenges(): Promise<QuickChallenge[]>;
  mapToPublic(full: QuickChallenge): PublicQuickChallenge;
}

export class ServerQuickChallengeRepository implements IQuickChallengeRepository {
  private challenges: Map<string, QuickChallenge> = new Map();

  constructor(initial: QuickChallenge[] = SEED_QUICK_CHALLENGES) {
    for (const c of initial) {
      this.challenges.set(c.id, c);
    }
  }

  async getChallenge(id: string): Promise<QuickChallenge | null> {
    return this.challenges.get(id) || null;
  }

  async getAllChallenges(): Promise<QuickChallenge[]> {
    return Array.from(this.challenges.values());
  }

  async getChallengesByCategory(
    category: QuickChallengeCategory,
  ): Promise<QuickChallenge[]> {
    return Array.from(this.challenges.values()).filter((c) => c.category === category);
  }

  async getPublicChallenge(id: string): Promise<PublicQuickChallenge | null> {
    const full = this.challenges.get(id);
    if (!full) return null;
    return this.mapToPublic(full);
  }

  async getAllPublicChallenges(): Promise<PublicQuickChallenge[]> {
    return Array.from(this.challenges.values()).map((c) => this.mapToPublic(c));
  }

  async getQuickPlayChallenges(): Promise<QuickChallenge[]> {
    const categories: QuickChallengeCategory[] = [
      "CODE_BREAKER",
      "PATTERN_LOGIC",
      "SEQUENCE",
      "OPTIMIZATION",
      "LOGIC_DEDUCTION",
    ];

    const selected: QuickChallenge[] = [];

    for (const cat of categories) {
      const available = await this.getChallengesByCategory(cat);
      if (available.length > 0) {
        // Deterministic balanced pick based on day/session
        const randomIndex = Math.floor(Math.random() * available.length);
        selected.push(available[randomIndex]!);
      }
    }

    return selected;
  }

  public mapToPublic(full: QuickChallenge): PublicQuickChallenge {
    return {
      id: full.id,
      category: full.category,
      difficulty: full.difficulty,
      title: full.title,
      prompt: full.prompt,
      instructions: full.instructions,
      clues: full.clues,
      inputType: full.inputType,
      options: full.options,
      placeholder: full.placeholder,
      timeLimitSec: full.timeLimitSec,
    };
  }
}

export const serverQuickChallengeRepository = new ServerQuickChallengeRepository();
