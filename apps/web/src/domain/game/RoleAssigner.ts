import type { PlayerRole, RoundSecrets } from '@/types/game';
import type { RoomSettings } from '@/types/room';
import type { WordPair } from '@/types/word-pair';
import { computeAutomaticOddPlayerCount } from '@/domain/room/RoomSettingsValidator';

export function determineOddPlayerCount(playerCount: number, settings: RoomSettings): number {
  if (settings.oddPlayerMode === 'ONE') return 1;
  if (settings.oddPlayerMode === 'TWO') return Math.min(2, Math.floor(playerCount / 2));
  return computeAutomaticOddPlayerCount(playerCount);
}

export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const randomVal = bytes[0] ?? 0;
    const j = randomVal % (i + 1);
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
  return array;
}

export function assignRolesAndWords(
  playerIds: string[],
  settings: RoomSettings,
  wordPair: WordPair,
): RoundSecrets {
  const oddCount = determineOddPlayerCount(playerIds.length, settings);
  const shuffled = shuffleArray(playerIds);
  const oddPlayerUids = shuffled.slice(0, oddCount);
  const oddSet = new Set(oddPlayerUids);

  const roleAssignments: Record<string, PlayerRole> = {};
  for (const uid of playerIds) {
    roleAssignments[uid] = oddSet.has(uid) ? 'ODD' : 'NORMAL';
  }

  return {
    wordPairId: wordPair.id,
    majorityWord: wordPair.majorityWord,
    oddWord: wordPair.oddWord,
    oddPlayerUids,
    roleAssignments,
  };
}

