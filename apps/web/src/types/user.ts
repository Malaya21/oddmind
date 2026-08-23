export interface UserStatsSummary {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
}

export interface User {
  uid: string;
  displayName?: string;
  createdAt: string;
  lastSeenAt: string;
  stats?: UserStatsSummary;
}
