import type { WordPair } from "@/types/word-pair";

/**
 * Seed catalog for development. Production loads from WordPairRepository.
 * Game logic must never hard-code pairs outside the content layer.
 */
export const SEED_WORD_PAIRS: WordPair[] = [
  {
    id: "coffee-tea",
    majorityWord: "COFFEE",
    oddWord: "TEA",
    category: "beverages",
    difficulty: "easy",
    distractors: ["JUICE", "MILK"],
  },
  {
    id: "dog-wolf",
    majorityWord: "DOG",
    oddWord: "WOLF",
    category: "animals",
    difficulty: "easy",
    distractors: ["FOX", "BEAR"],
  },
  {
    id: "car-bus",
    majorityWord: "CAR",
    oddWord: "BUS",
    category: "transport",
    difficulty: "easy",
    distractors: ["TRAIN", "TRUCK"],
  },
  {
    id: "mountain-hill",
    majorityWord: "MOUNTAIN",
    oddWord: "HILL",
    category: "geography",
    difficulty: "medium",
    distractors: ["VALLEY", "PLATEAU"],
  },
  {
    id: "ocean-lake",
    majorityWord: "OCEAN",
    oddWord: "LAKE",
    category: "geography",
    difficulty: "medium",
    distractors: ["RIVER", "POND"],
  },
  {
    id: "laptop-tablet",
    majorityWord: "LAPTOP",
    oddWord: "TABLET",
    category: "technology",
    difficulty: "medium",
    distractors: ["PHONE", "MONITOR"],
  },
  {
    id: "python-javascript",
    majorityWord: "PYTHON",
    oddWord: "JAVASCRIPT",
    category: "technology",
    difficulty: "hard",
    distractors: ["RUBY", "TYPESCRIPT"],
  },
  {
    id: "doctor-nurse",
    majorityWord: "DOCTOR",
    oddWord: "NURSE",
    category: "professions",
    difficulty: "medium",
    distractors: ["DENTIST", "PHARMACIST"],
  },
  {
    id: "football-basketball",
    majorityWord: "FOOTBALL",
    oddWord: "BASKETBALL",
    category: "sports",
    difficulty: "easy",
    distractors: ["TENNIS", "HOCKEY"],
  },
  {
    id: "rain-snow",
    majorityWord: "RAIN",
    oddWord: "SNOW",
    category: "weather",
    difficulty: "easy",
    distractors: ["HAIL", "SLEET"],
  },
];

export function getWordPairById(id: string): WordPair | null {
  return SEED_WORD_PAIRS.find((p) => p.id === id) ?? null;
}

export function getRandomWordPair(excludeIds: string[] = []): WordPair {
  const excludeSet = new Set(excludeIds);
  const candidates = SEED_WORD_PAIRS.filter((p) => !excludeSet.has(p.id));
  const pool = candidates.length > 0 ? candidates : SEED_WORD_PAIRS;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const randomValue = bytes[0] ?? 0;
  const idx = randomValue % pool.length;
  const item = pool[idx] ?? pool[0];
  if (!item) {
    throw new Error("Word pair pool is empty.");
  }
  return item;
}

export function getWordDistractors(pair: WordPair, count = 2): string[] {
  return pair.distractors.slice(0, count);
}

