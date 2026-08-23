import type {
  AdvancePhaseCommand,
  AdvancePhaseResult,
  ChatMessage,
  Clue,
  EliminationEvent,
  Game,
  GamePhase,
  GameResult,
  GameSecrets,
  Round,
  Vote,
} from "@/types";
import type {
  GameRepository,
  PlayerRepository,
  RoomRepository,
  RoundRepository,
  WordPairRepository,
} from "@/repositories";
import type { GameService } from "@/services/GameService";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { assignRolesAndWords } from "@/domain/game/RoleAssigner";
import { generateRoomCode } from "@/lib/room-code";
import { evaluatePhaseAdvance } from "@/domain/game/PhaseAdvancement";
import { tallyVotes } from "@/domain/voting/VoteTallyCalculator";

export function getPhaseDurationSec(phase: GamePhase, game: Game): number {
  switch (phase) {
    case "WORD_ASSIGNMENT":
      return 10;
    case "CLUE_PHASE":
      return game.settings.clueDurationSec;
    case "DISCUSSION_PHASE":
      return game.settings.discussionDurationSec;
    case "VOTING_PHASE":
      return game.settings.votingDurationSec;
    case "VOTE_REVEAL":
      return 8;
    case "ELIMINATION":
      return 6;
    case "FINAL_RESULT":
      return 15;
    default:
      return 10;
  }
}

// In-memory rate limiting map for chat: uid -> lastSentTimestampMs
const chatRateLimitMap = new Map<string, number>();

export class GameServiceImpl implements GameService {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly roundRepository: RoundRepository,
    private readonly wordPairRepository: WordPairRepository,
    private readonly roomRepository: RoomRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async startGame(roomId: string, hostUid: string): Promise<{ gameId: string }> {
    const room = await this.roomRepository.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostUid !== hostUid) {
      throw new UnauthorizedError(
        "ONLY_HOST_CAN_START",
        "Only the host can start the game.",
      );
    }

    if (room.status !== "LOBBY") {
      if (room.gameId) {
        return { gameId: room.gameId };
      }
      throw new ConflictError(
        "GAME_ALREADY_STARTED",
        "Game has already started.",
      );
    }

    const players = await this.playerRepository.getPlayers(roomId);
    if (players.length < room.settings.minPlayers) {
      throw new ValidationError(
        "NOT_ENOUGH_PLAYERS",
        `Need at least ${room.settings.minPlayers} players to start. Currently have ${players.length}.`,
      );
    }

    const gameId = generateRoomCode(8);
    const playerIds = players.map((p) => p.uid);
    const wordPair = await this.wordPairRepository.getRandomPair();
    const roundSecrets = assignRolesAndWords(playerIds, room.settings, wordPair);

    const now = new Date();
    const phaseStartedAt = now.toISOString();
    const durationSec = 10; // 10s for initial WORD_ASSIGNMENT
    const phaseEndsAt = new Date(now.getTime() + durationSec * 1000).toISOString();

    const scores: Record<string, number> = {};
    for (const uid of playerIds) {
      scores[uid] = 0;
    }

    const game: Game = {
      id: gameId,
      roomId: room.id,
      roomCode: room.roomCode,
      phase: "WORD_ASSIGNMENT",
      currentRound: 1,
      totalRounds: playerIds.length - 1,
      settings: room.settings,
      phaseStartedAt,
      phaseEndsAt,
      version: 1,
      playerIds,
      activePlayerIds: [...playerIds],
      eliminatedPlayerIds: [],
      eliminationHistory: [],
      scores,
      status: "ACTIVE",
      createdAt: phaseStartedAt,
      updatedAt: phaseStartedAt,
    };

    const round: Round = {
      id: "round_1",
      roundNumber: 1,
      phase: "WORD_ASSIGNMENT",
      clues: {},
    };

    const secrets: GameSecrets = {
      gameId,
      wordPairId: wordPair.id,
      majorityWord: wordPair.majorityWord,
      oddWord: wordPair.oddWord,
      oddPlayerUids: roundSecrets.oddPlayerUids,
      roleAssignments: roundSecrets.roleAssignments,
    };

    await this.roundRepository.createRound(gameId, round);
    await this.gameRepository.writeSecrets(gameId, secrets);
    await this.gameRepository.createGame(game);
    await this.roomRepository.updateRoom(room.id, {
      status: "IN_PROGRESS",
      gameId,
    });

    return { gameId };
  }

  async submitClue(
    gameId: string,
    uid: string,
    displayName: string,
    text: string,
  ): Promise<void> {
    const game = await this.gameRepository.getGame(gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }
    if (game.phase !== "CLUE_PHASE") {
      throw new ConflictError("INVALID_PHASE", "Clues can only be submitted during the Clue Phase.");
    }
    if (!game.activePlayerIds.includes(uid)) {
      throw new UnauthorizedError("NOT_ACTIVE_PLAYER", "Eliminated players cannot submit clues.");
    }

    const cleanedText = text.trim();
    if (!cleanedText) {
      throw new ValidationError("EMPTY_CLUE", "Clue text cannot be empty.");
    }
    if (cleanedText.length > 50) {
      throw new ValidationError("CLUE_TOO_LONG", "Clue is too long (max 50 characters).");
    }

    const roundId = `round_${game.currentRound}`;
    const clue: Clue = {
      uid,
      displayName,
      text: cleanedText,
      submittedAt: new Date().toISOString(),
    };

    await this.roundRepository.submitClue(gameId, roundId, clue);

    // Check if all currently active players submitted clues
    const round = await this.roundRepository.getRound(gameId, roundId);
    const submittedCount = Object.keys(round?.clues ?? {}).filter((id) =>
      game.activePlayerIds.includes(id),
    ).length;

    if (submittedCount >= game.activePlayerIds.length) {
      // Auto-advance to DISCUSSION_PHASE
      await this.advancePhase({
        gameId,
        expectedPhase: "CLUE_PHASE",
        triggeredBy: "client",
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  async submitVote(
    gameId: string,
    voterUid: string,
    targetUid: string,
  ): Promise<void> {
    const game = await this.gameRepository.getGame(gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }
    if (game.phase !== "VOTING_PHASE") {
      throw new ConflictError("INVALID_PHASE", "Votes can only be cast during the Voting Phase.");
    }
    if (!game.activePlayerIds.includes(voterUid)) {
      throw new UnauthorizedError("NOT_ACTIVE_PLAYER", "Eliminated players cannot vote.");
    }
    if (voterUid === targetUid) {
      throw new ValidationError("SELF_VOTE", "You cannot vote for yourself.");
    }
    if (!game.activePlayerIds.includes(targetUid)) {
      throw new ValidationError("INVALID_TARGET", "You can only vote for active players.");
    }

    const roundId = `round_${game.currentRound}`;
    const vote: Vote = {
      voterUid,
      targetUid,
      submittedAt: new Date().toISOString(),
    };

    await this.roundRepository.submitVote(gameId, roundId, vote);

    // Check if all active players cast votes
    const votes = await this.roundRepository.getVotes(gameId, roundId);
    const activeVoters = new Set(
      votes.map((v) => v.voterUid).filter((id) => game.activePlayerIds.includes(id)),
    );

    if (activeVoters.size >= game.activePlayerIds.length) {
      // Auto-advance to VOTE_REVEAL
      await this.advancePhase({
        gameId,
        expectedPhase: "VOTING_PHASE",
        triggeredBy: "client",
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  async sendMessage(
    gameId: string,
    uid: string,
    displayName: string,
    text: string,
  ): Promise<ChatMessage> {
    const game = await this.gameRepository.getGame(gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }
    if (!game.playerIds.includes(uid)) {
      throw new UnauthorizedError("NOT_IN_GAME", "You are not a participant in this game.");
    }
    if (!game.activePlayerIds.includes(uid)) {
      throw new UnauthorizedError("ELIMINATED_PLAYER_CHAT", "Spectators and eliminated players cannot send chat messages.");
    }

    // Rate limit check: max 1 message per 400ms
    const nowMs = Date.now();
    const lastSent = chatRateLimitMap.get(uid) ?? 0;
    if (nowMs - lastSent < 400) {
      throw new ConflictError("RATE_LIMITED", "Please wait a moment before sending another message.");
    }
    chatRateLimitMap.set(uid, nowMs);

    const trimmed = text.trim();
    if (!trimmed) {
      throw new ValidationError("EMPTY_MESSAGE", "Message cannot be empty.");
    }
    if (trimmed.length > 200) {
      throw new ValidationError("MESSAGE_TOO_LONG", "Message cannot exceed 200 characters.");
    }

    const message: ChatMessage = {
      id: `${nowMs}_${Math.random().toString(36).substring(2, 7)}`,
      uid,
      displayName,
      text: trimmed,
      createdAt: new Date(nowMs).toISOString(),
    };

    const roundId = `round_${game.currentRound}`;
    await this.roundRepository.addMessage(gameId, roundId, message);
    return message;
  }

  async leaveGame(gameId: string, uid: string): Promise<void> {
    const game = await this.gameRepository.getGame(gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }

    const updatedActive = game.activePlayerIds.filter((id) => id !== uid);
    const updatedEliminated = game.eliminatedPlayerIds.includes(uid)
      ? game.eliminatedPlayerIds
      : [...game.eliminatedPlayerIds, uid];

    await this.gameRepository.updateGame(
      gameId,
      {
        activePlayerIds: updatedActive,
        eliminatedPlayerIds: updatedEliminated,
      },
      game.version,
    );

    await this.playerRepository.updatePlayer(game.roomId, uid, {
      active: false,
      connectionStatus: "disconnected",
      lastSeenAt: new Date().toISOString(),
    });

    await this.playerRepository.leaveLobby(game.roomId, uid);
  }

  async advancePhase(command: AdvancePhaseCommand): Promise<AdvancePhaseResult> {
    const game = await this.gameRepository.getGame(command.gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }

    const roundId = `round_${game.currentRound}`;
    const secrets = await this.gameRepository.getSecrets(game.id);

    let nextPhaseOverride: GamePhase | null = null;
    let updatedActivePlayerIds = [...game.activePlayerIds];
    let updatedEliminatedPlayerIds = [...game.eliminatedPlayerIds];
    let updatedEliminationHistory = [...game.eliminationHistory];
    let updatedWinner = game.winner;
    let updatedWinReason = game.winReason;
    let updatedScores = { ...game.scores };

    if (game.phase === "VOTING_PHASE") {
      const votes = await this.roundRepository.getVotes(game.id, roundId);
      const tally = tallyVotes(
        votes,
        game.activePlayerIds,
        secrets?.oddPlayerUids ?? [],
      );

      for (const [pUid, delta] of Object.entries(tally.roundScores)) {
        updatedScores[pUid] = (updatedScores[pUid] ?? 0) + delta;
      }

      // Record round results
      await this.roundRepository.createRound(game.id, {
        id: roundId,
        roundNumber: game.currentRound,
        phase: "VOTE_REVEAL",
        clues: (await this.roundRepository.getRound(game.id, roundId))?.clues ?? {},
        voteResults: tally.voteTally,
      });

      nextPhaseOverride = "VOTE_REVEAL";
    } else if (game.phase === "VOTE_REVEAL") {
      // Execute elimination & Check win conditions
      const votes = await this.roundRepository.getVotes(game.id, roundId);
      const tally = tallyVotes(
        votes,
        game.activePlayerIds,
        secrets?.oddPlayerUids ?? [],
      );

      const eliminatedUid = tally.eliminatedUid;
      const roomPlayers = await this.playerRepository.getPlayers(game.roomId);
      const eliminatedPlayerProfile = roomPlayers.find((p) => p.uid === eliminatedUid);

      const eliminationEvent: EliminationEvent = {
        roundNumber: game.currentRound,
        eliminatedUid,
        displayName: eliminatedPlayerProfile?.displayName ?? "Player",
        votesReceived: tally.votesReceived,
        wasOddPlayer: tally.wasOddPlayer,
        timestamp: new Date().toISOString(),
      };

      updatedActivePlayerIds = game.activePlayerIds.filter((id) => id !== eliminatedUid);
      if (!updatedEliminatedPlayerIds.includes(eliminatedUid)) {
        updatedEliminatedPlayerIds.push(eliminatedUid);
      }
      updatedEliminationHistory.push(eliminationEvent);

      if (tally.isMatchOver) {
        updatedWinner = tally.winner;
        updatedWinReason = tally.winReason;
        nextPhaseOverride = "FINAL_RESULT";
      } else {
        nextPhaseOverride = "ELIMINATION";
      }
    }

    const evaluation = evaluatePhaseAdvance(
      game,
      command,
      (_cmd, currentPhase) => {
        if (nextPhaseOverride) {
          return nextPhaseOverride;
        }
        switch (currentPhase) {
          case "STARTING":
            return "WORD_ASSIGNMENT";
          case "WORD_ASSIGNMENT":
            return "CLUE_PHASE";
          case "CLUE_PHASE":
            return "DISCUSSION_PHASE";
          case "DISCUSSION_PHASE":
            return "VOTING_PHASE";
          case "VOTING_PHASE":
            return "VOTE_REVEAL";
          case "VOTE_REVEAL":
            return "ELIMINATION";
          case "ELIMINATION":
            return "CLUE_PHASE";
          case "FINAL_RESULT":
            return "GAME_OVER";
          default:
            return null;
        }
      },
    );

    if (evaluation.noOp || !evaluation.nextPhase) {
      return evaluation.result!;
    }

    const nextPhase = evaluation.nextPhase;
    const now = new Date();
    const durationSec = getPhaseDurationSec(nextPhase, game);
    const phaseEndsAt = new Date(now.getTime() + durationSec * 1000).toISOString();

    let nextRound = game.currentRound;
    // When cycling from ELIMINATION back to CLUE_PHASE, increment elimination cycle number
    if (game.phase === "ELIMINATION" && nextPhase === "CLUE_PHASE") {
      nextRound = game.currentRound + 1;
      await this.roundRepository.createRound(game.id, {
        id: `round_${nextRound}`,
        roundNumber: nextRound,
        phase: "CLUE_PHASE",
        clues: {},
      });
    }

    const updatedGame: Game = {
      ...game,
      phase: nextPhase,
      currentRound: nextRound,
      scores: updatedScores,
      activePlayerIds: updatedActivePlayerIds,
      eliminatedPlayerIds: updatedEliminatedPlayerIds,
      eliminationHistory: updatedEliminationHistory,
      ...(updatedWinner ? { winner: updatedWinner } : {}),
      ...(updatedWinReason ? { winReason: updatedWinReason } : {}),
      phaseStartedAt: now.toISOString(),
      phaseEndsAt,
      version: game.version + 1,
      status: (nextPhase === "GAME_OVER" || nextPhase === "FINAL_RESULT") ? "COMPLETED" : game.status,
      updatedAt: now.toISOString(),
    };

    await this.gameRepository.updateGame(game.id, updatedGame, game.version);

    if (nextPhase === "GAME_OVER" || nextPhase === "FINAL_RESULT") {
      await this.roomRepository.updateRoom(game.roomId, {
        status: "COMPLETED",
      });
    }

    return {
      game: updatedGame,
      previousPhase: game.phase,
      newPhase: nextPhase,
      transitioned: true,
    };
  }

  async getGameResult(gameId: string): Promise<GameResult | null> {
    const game = await this.gameRepository.getGame(gameId);
    if (!game) {
      return null;
    }

    const roomPlayers = await this.playerRepository.getPlayers(game.roomId);
    const now = new Date().toISOString();
    const rankings = Object.entries(game.scores)
      .map(([uid, totalScore]) => {
        const p = roomPlayers.find((rp) => rp.uid === uid);
        return {
          uid,
          displayName: p?.displayName ?? "Player",
          totalScore,
          rank: 1,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return {
      gameId: game.id,
      roomCode: game.roomCode,
      rankings,
      thinkingProfiles: {},
      completedAt: now,
    };
  }
}
