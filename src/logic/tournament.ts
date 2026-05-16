import { Player, Match, Rotation } from '../types';

export const ROTATION_DURATION = 15; // minutes
export const BREAK_DURATION = 3; // minutes

function getCourtCount(playerCount: number): number {
  return Math.floor(playerCount / 4);
}

function getByeCount(playerCount: number): number {
  return playerCount % 4;
}

export function createInitialRotation(players: Player[], startTime: string): Rotation {
  const playerCount = players.length;
  const courtCount = getCourtCount(playerCount);
  const byeCount = getByeCount(playerCount);
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  const byePlayerIds = shuffled.slice(courtCount * 4).map(p => p.id);
  const activePlayers = shuffled.slice(0, courtCount * 4);

  const matches: Match[] = [];
  for (let i = 0; i < courtCount; i++) {
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
  const courtCount = getCourtCount(playerCount);
  const byeCount = getByeCount(playerCount);

  const results = currentRotation.matches
    .sort((a, b) => a.court - b.court)
    .map(m => {
      const s1 = m.score1 || 0;
      const s2 = m.score2 || 0;
      return {
        court: m.court,
        winners: s1 >= s2 ? [...m.team1] : [...m.team2],
        losers: s1 >= s2 ? [...m.team2] : [...m.team1],
      };
    });

  // Principe montante-descendante :
  // - Terrain du haut (courtCount) : gagnants du haut + gagnants du milieu
  // - Terrains du milieu : gagnants du terrain i-1 + perdants du terrain i+1
  // - Terrain du bas (1) : perdants terrain 1 + perdants terrain 2 + joueurs au repos

  const nextCourtPlayers: string[][] = Array.from({ length: courtCount }, () => []);

  // Terrain le plus haut : gagnants des 2 terrains les plus hauts
  const topCourt = courtCount;
  nextCourtPlayers[topCourt - 1] = [
    ...results[topCourt - 1].winners,
    ...results[topCourt - 2].winners,
  ];

  // Terrains intermédiaires
  for (let i = courtCount - 2; i >= 1; i--) {
    nextCourtPlayers[i - 1 + 1] = [
      ...results[i - 1].winners,
      ...results[i].losers,
    ];
  }

  // Terrain le plus bas : perdants des 2 terrains les plus bas + joueurs au repos
  const bottomLosers = [...results[0].losers, ...results[1].losers];
  const prevByePlayers = currentRotation.byePlayerIds;

  // On détermine qui va au repos ce tour-ci
  let nextByePlayerIds: string[] = [];
  let bottomPool = [...bottomLosers, ...prevByePlayers];

  if (byeCount === 0) {
    // 8, 12, 16 joueurs : personne au repos
    nextByePlayerIds = [];
    nextCourtPlayers[0] = bottomPool;
  } else {
    // On met au repos `byeCount` joueurs parmi les perdants du bas
    // Priorité : ceux qui ont déjà joué le plus (ici on prend aléatoirement parmi les perdants du terrain 1)
    const shuffledBottom = [...bottomPool].sort(() => Math.random() - 0.5);
    nextByePlayerIds = shuffledBottom.slice(0, byeCount);
    nextCourtPlayers[0] = shuffledBottom.slice(byeCount, byeCount + 4);
  }

  const arrangeCourt = (courtPlayers: string[], prevMatches: Match[], court: number): Match => {
    let bestMatch: Match | null = null;

    for (let attempt = 0; attempt < 50; attempt++) {
      const shuffled = [...courtPlayers].sort(() => Math.random() - 0.5);
      const team1: [string, string] = [shuffled[0], shuffled[1]];
      const team2: [string, string] = [shuffled[2], shuffled[3]];

      const wasPartner = (p1: string, p2: string) =>
        prevMatches.some(
          m =>
            (m.team1.includes(p1) && m.team1.includes(p2)) ||
            (m.team2.includes(p1) && m.team2.includes(p2))
        );

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
      bestMatch = {
        id: `r${rotationIndex}-t${court}`,
        court,
        team1: [courtPlayers[0], courtPlayers[1]],
        team2: [courtPlayers[2], courtPlayers[3]],
        score1: null,
        score2: null,
      };
    }

    return bestMatch;
  };

  const nextRotationStartTime = addMinutes(
    currentRotation.startTime,
    ROTATION_DURATION + BREAK_DURATION
  );

  return {
    id: rotationIndex,
    startTime: nextRotationStartTime,
    matches: nextCourtPlayers.map((players, i) =>
      arrangeCourt(players, currentRotation.matches, i + 1)
    ),
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
