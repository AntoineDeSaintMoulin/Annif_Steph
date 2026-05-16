export interface Player {
  id: string;
  name: string;
  points: number;
}

export interface Match {
  id: string;
  court: number;
  team1: [string, string];
  team2: [string, string];
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
  playerCount: number;
  rotationCount: number;
  rotations: Rotation[];
  currentRotationIndex: number;
  startTime: string;
}
