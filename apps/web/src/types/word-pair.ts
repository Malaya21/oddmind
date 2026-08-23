export type WordDifficulty = "easy" | "medium" | "hard";

export interface WordPair {
  id: string;
  majorityWord: string;
  oddWord: string;
  category: string;
  difficulty: WordDifficulty;
  distractors: string[];
}

export interface WordPairQueryOptions {
  difficulty?: WordDifficulty;
  category?: string;
  excludeIds?: string[];
}
