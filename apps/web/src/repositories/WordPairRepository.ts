import type { WordPair, WordPairQueryOptions } from "@/types";

export interface WordPairRepository {
  getRandomPair(options?: WordPairQueryOptions): Promise<WordPair>;
  getById(id: string): Promise<WordPair | null>;
  getDistractors(pair: WordPair, count: number): Promise<string[]>;
}
