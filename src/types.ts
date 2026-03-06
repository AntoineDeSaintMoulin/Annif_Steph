export interface Player {
  id: string;
  name: string;
  points: number;
}

export interface Match {
  id: string;
  court: number; // 1, 2, 3
  team1: [string, string]; // Player IDs
  team2: [string, string]; // Player IDs
  score1: number | null;
  score2: number | null;
}

export interface Rotation {
  id: number;
  startTime: string;
  matches: Match[];
  byePlayerIds: string[];
  isCompleted: boolean;
}

export interface TournamentState {
  players: Player[];
  playerCount: 12 | 13 | 14;
  rotationCount: number;
  rotations: Rotation[];
  currentRotationIndex: number;
  startTime: string;
}
