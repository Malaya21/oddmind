import type { Vote, VoteTally } from '@/types/game';
import { SCORING } from '@/domain/scoring/ScoringConstants';

export interface EliminationTallyResult {
  voteTally: VoteTally;
  eliminatedUid: string;
  votesReceived: number;
  wasOddPlayer: boolean;
  isMatchOver: boolean;
  winner?: "NORMAL" | "ODD";
  winReason?: string;
  roundScores: Record<string, number>;
}

export function tallyVotes(
  votes: Vote[],
  activePlayerIds: string[],
  oddPlayerUids: string[],
): EliminationTallyResult {
  const activeSet = new Set(activePlayerIds);
  const oddSet = new Set(oddPlayerUids);

  const counts: Record<string, number> = {};
  for (const uid of activePlayerIds) {
    counts[uid] = 0;
  }

  // Count votes from active players to active players
  for (const vote of votes) {
    if (activeSet.has(vote.voterUid) && activeSet.has(vote.targetUid)) {
      counts[vote.targetUid] = (counts[vote.targetUid] ?? 0) + 1;
    }
  }

  let maxVotes = -1;
  for (const count of Object.values(counts)) {
    if (count > maxVotes) maxVotes = count;
  }

  const topCandidates: string[] = [];
  for (const [uid, count] of Object.entries(counts)) {
    if (count === maxVotes) {
      topCandidates.push(uid);
    }
  }

  // Deterministic tie-breaker: if tied, sort alphabetically and select first
  // Or pick first top candidate
  const sortedTied = [...topCandidates].sort();
  const eliminatedUid = sortedTied[0] ?? activePlayerIds[0]!;
  const votesReceived = counts[eliminatedUid] ?? 0;
  const wasOddPlayer = oddSet.has(eliminatedUid);

  const voteTally: VoteTally = {
    counts,
    eliminatedUid,
    ...(topCandidates.length > 1 ? { tiedUids: topCandidates } : {}),
    wasOddPlayer,
  };

  // Check remaining active count after this elimination
  const remainingActive = activePlayerIds.filter((id) => id !== eliminatedUid);

  let isMatchOver = false;
  let winner: "NORMAL" | "ODD" | undefined;
  let winReason: string | undefined;

  if (wasOddPlayer) {
    // Condition A: Odd player eliminated -> Normal players win immediately
    isMatchOver = true;
    winner = "NORMAL";
    winReason = "The Odd Player was caught and eliminated!";
  } else if (remainingActive.length <= 2) {
    // Condition B: Odd player survived to the final 2 -> Odd player wins
    isMatchOver = true;
    winner = "ODD";
    winReason = "The Odd Player successfully deceived everyone and survived to the final 2!";
  }

  // Calculate scores
  const roundScores: Record<string, number> = {};
  for (const uid of activePlayerIds) {
    roundScores[uid] = 0;
  }

  for (const vote of votes) {
    if (!activeSet.has(vote.voterUid)) continue;
    const voterIsOdd = oddSet.has(vote.voterUid);
    if (!voterIsOdd) {
      if (oddSet.has(vote.targetUid)) {
        roundScores[vote.voterUid] = (roundScores[vote.voterUid] ?? 0) + SCORING.CORRECT_VOTE;
      } else {
        roundScores[vote.voterUid] = (roundScores[vote.voterUid] ?? 0) + SCORING.INCORRECT_VOTE;
      }
    }
  }

  if (!wasOddPlayer) {
    for (const oddUid of oddPlayerUids) {
      if (activeSet.has(oddUid)) {
        roundScores[oddUid] =
          (roundScores[oddUid] ?? 0) +
          SCORING.ODD_SURVIVES +
          SCORING.SUCCESSFUL_DECEPTION;
      }
    }
  }

  return {
    voteTally,
    eliminatedUid,
    votesReceived,
    wasOddPlayer,
    isMatchOver,
    winner,
    winReason,
    roundScores,
  };
}

