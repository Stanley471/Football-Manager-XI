export interface Club {
  id: string;
  name: string;
  shortName: string;
  budget: number;
  tactic?: Tactic;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age: number;
  rating: number;
  marketValue: number;
  shirtNumber: number;
  isStarting: boolean;
}

export interface Tactic {
  id: string;
  clubId: string;
  formation: string;
  mentality: string;
}

export interface Fixture {
  id: string;
  homeClubId: string;
  awayClubId: string;
  scheduledAt: string;
  status: string;
  season: string;
  homeClub: Club;
  awayClub: Club;
  match?: Match;
}

export interface Match {
  id: string;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  playedAt: string;
  events?: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  matchId: string;
  minute: number;
  type: string;
  playerId?: string;
  clubId?: string;
}

export interface LeagueRow {
  clubId: string;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  return res.json();
}

export const getClub = (clubId: string) => fetchAPI<Club>(`/clubs/${clubId}`);

export const getSquad = (clubId: string) => fetchAPI<Player[]>(`/clubs/${clubId}/squad`);

export const getTactics = (clubId: string) => fetchAPI<Tactic>(`/clubs/${clubId}/tactics`);

export const updateTactics = (clubId: string, data: { formation: string; mentality: string }) => 
  fetchAPI<Tactic>(`/clubs/${clubId}/tactics`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const updateStartingXI = (clubId: string, playerIds: string[]) => 
  fetchAPI<{ message: string }>(`/clubs/${clubId}/starting-xi`, {
    method: 'PUT',
    body: JSON.stringify({ playerIds }),
  });

export const getFixtures = (clubId: string) => fetchAPI<Fixture[]>(`/clubs/${clubId}/fixtures`);

export const simulateFixture = (fixtureId: string) => 
  fetchAPI<{ fixture: Fixture; result: { homeScore: number; awayScore: number }; events: MatchEvent[] }>(`/fixtures/${fixtureId}/simulate`, {
    method: 'POST',
  });

export const getLeagueTable = (season: string = '2026/2027') => 
  fetchAPI<LeagueRow[]>(`/leagues/${encodeURIComponent(season)}/table`);
