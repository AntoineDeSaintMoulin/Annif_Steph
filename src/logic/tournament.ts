import { Player, Match, Rotation } from '../types';

export const ROTATION_DURATION = 15; // minutes
export const BREAK_DURATION = 3; // minutes

export function createInitialRotation(players: Player[], startTime: string): Rotation {
  const playerCount = players.length;
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  
  let byePlayerIds: string[] = [];
  let activePlayers: Player[] = [];

  if (playerCount === 12) {
    activePlayers = shuffled;
  } else if (playerCount === 13) {
    byePlayerIds = [shuffled[12].id];
    activePlayers = shuffled.slice(0, 12);
  } else if (playerCount === 14) {
    byePlayerIds = [shuffled[12].id, shuffled[13].id];
    activePlayers = shuffled.slice(0, 12);
  }

  const matches: Match[] = [];
  for (let i = 0; i < 3; i++) {
    matches.push({
      id: `r0-t${i + 1}`,
      court: i + 1,
      team1: [activePlayers[i * 4].id, activePlayers[i * 4 + 1].id],
      team2: [activePlayers[i * 4 + 2].id, activePlayers[i * 4 + 3].id],
      score1: null,
      score2: null,
    });
  }

  return {
    id: 0,
    startTime,
    matches,
    byePlayerIds,
    isCompleted: false,
  };
}

export function calculateNextRotation(
  currentRotation: Rotation,
  players: Player[],
  rotationIndex: number
): Rotation {
  const playerCount = players.length;
  const results = currentRotation.matches.map(m => {
    const s1 = m.score1 || 0;
    const s2 = m.score2 || 0;
    return {
      court: m.court,
      winners: s1 > s2 ? m.team1 : m.team2,
      losers: s1 > s2 ? m.team2 : m.team1,
    };
  });

  const t3 = results.find(r => r.court === 3)!;
  const t2 = results.find(r => r.court === 2)!;
  const t1 = results.find(r => r.court === 1)!;

  const nextT3Players = [...t3.winners, ...t2.winners];
  const nextT2Players = [...t3.losers, ...t1.winners];
  
  let nextT1Players: string[] = [];
  let nextByePlayerIds: string[] = [];

  if (playerCount === 12) {
    nextT1Players = [...t1.losers, ...t2.losers];
    nextByePlayerIds = [];
  } else if (playerCount === 13) {
    const t1Losers = [...t1.losers].sort(() => Math.random() - 0.5);
    nextByePlayerIds = [t1Losers[0]];
    const t1Stayer = t1Losers[1];
    nextT1Players = [t1Stayer, ...currentRotation.byePlayerIds, ...t2.losers];
  } else if (playerCount === 14) {
    nextByePlayerIds = [...t1.losers];
    nextT1Players = [...currentRotation.byePlayerIds, ...t2.losers];
  }

  const arrangeCourt = (courtPlayers: string[], prevMatches: Match[], court: number): Match => {
    let bestMatch: Match | null = null;
    
    for (let attempt = 0; attempt < 50; attempt++) {
      const shuffled = [...courtPlayers].sort(() => Math.random() - 0.5);
      const team1: [string, string] = [shuffled[0], shuffled[1]];
      const team2: [string, string] = [shuffled[2], shuffled[3]];
      
      const wasPartner = (p1: string, p2: string) => {
        return prevMatches.some(m => 
          (m.team1.includes(p1) && m.team1.includes(p2)) ||
          (m.team2.includes(p1) && m.team2.includes(p2))
        );
      };

      if (!wasPartner(team1[0], team1[1]) && !wasPartner(team2[0], team2[1])) {
        bestMatch = {
          id: `r${rotationIndex}-t${court}`,
          court,
          team1,
          team2,
          score1: null,
          score2: null,
        };
        break;
      }
    }

    if (!bestMatch) {
      const shuffled = [...courtPlayers];
      bestMatch = {
        id: `r${rotationIndex}-t${court}`,
        court,
        team1: [shuffled[0], shuffled[1]],
        team2: [shuffled[2], shuffled[3]],
        score1: null,
        score2: null,
      };
    }
    
    return bestMatch;
  };

  const nextRotationStartTime = addMinutes(currentRotation.startTime, ROTATION_DURATION + BREAK_DURATION);

  return {
    id: rotationIndex,
    startTime: nextRotationStartTime,
    matches: [
      arrangeCourt(nextT1Players, currentRotation.matches, 1),
      arrangeCourt(nextT2Players, currentRotation.matches, 2),
      arrangeCourt(nextT3Players, currentRotation.matches, 3),
    ],
    byePlayerIds: nextByePlayerIds,
    isCompleted: false,
  };
}

function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function calculatePoints(rotations: Rotation[]): Record<string, number> {
  const points: Record<string, number> = {};
  
  rotations.forEach(rotation => {
    if (!rotation.isCompleted) return;
    
    rotation.matches.forEach(match => {
      const s1 = match.score1 || 0;
      const s2 = match.score2 || 0;
      const diff = s1 - s2;
      
      match.team1.forEach(pId => {
        points[pId] = (points[pId] || 0) + diff;
      });
      match.team2.forEach(pId => {
        points[pId] = (points[pId] || 0) - diff;
      });
    });
  });
  
  return points;
}
