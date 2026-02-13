// Authentication Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: 'admin' | 'scorer' | 'viewer';
  phoneNumber?: string;
  fcmToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Team Types
export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  primaryColor?: string;
  userId: string;
  players?: Player[];
  createdAt: string;
  updatedAt: string;
}

// Match Types
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned';
export type MatchType = 'T20' | 'ODI' | 'Test' | 'Custom';

export interface Match {
  id: string;
  name: string;
  matchType: MatchType;
  overs: number;
  venue: string;
  status: MatchStatus;
  team1Id?: string;
  team2Id?: string;
  teamAId?: string;
  teamBId?: string;
  userId: string;
  createdBy: string;
  scorerId?: string;
  scorerLockedAt?: string;
  tossWinnerId?: string;
  tossChoice?: 'bat' | 'field';
  teamAPlaying11?: string[];
  teamBPlaying11?: string[];
  teamACaptainId?: string;
  teamBCaptainId?: string;
  teamABattingOrder?: string[];
  teamBBattingOrder?: string[];
  currentInnings?: number;
  firstInningsRuns?: number;
  firstInningsWickets?: number;
  firstInningsOvers?: string;
  secondInningsRuns?: number;
  secondInningsWickets?: number;
  secondInningsOvers?: string;
  target?: number;
  createdAt: string;
  updatedAt: string;
  team1?: Team;
  team2?: Team;
  teamA?: Team;
  teamB?: Team;
  winnerTeamId?: string;
  resultType?: 'win-by-runs' | 'win-by-wickets' | 'tie' | 'draw';
  margin?: number;
  tossWinner?: Team;
  result?: string;
}

// Ball Types
export type WicketType = 'bowled' | 'lbw' | 'caught' | 'stumped' | 'run-out' | 'hit-wicket' | 'handled-ball' | 'obstructing-field';
export type ExtraType = 'wide' | 'no-ball' | 'bye' | 'leg-bye';

export interface Ball {
  id: string;
  matchId: string;
  inningsNumber: number;
  over: number;
  ballNumber: number;
  legalBallNumber: number;
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isWicket: boolean;
  wicketType?: WicketType;
  extras: ExtraType | 'none';
  extraRuns: number;
  isLegal: boolean;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

// Scorecard Types
export interface InningsInfo {
  inningsNumber: number;
  teamId: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  totalOvers: number;
  status: 'ongoing' | 'completed';
}

export interface Scorecard {
  matchId: string;
  innings: InningsInfo[];
  currentInnings: number;
  currentOver: number;
  currentBall: number;
}

export interface LiveScore {
  matchId: string;
  currentInnings: number;
  status: string;

  // Match Info
  matchInfo: {
    venue?: string;
    matchType: string;
    scorerName?: string;
    tossWinnerName?: string;
    tossChoice?: string;
    startTime?: string;
  };

  // Teams Info
  teams: {
    teamA: { id: string; name: string; logo?: string; playing11: Player[] };
    teamB: { id: string; name: string; logo?: string; playing11: Player[] };
  };

  // Batting team info (Current)
  battingTeam: {
    teamId: string;
    teamName: string;
    runs: number;
    wickets: number;
    overs: string;
    ballsFaced: number;
    runRate: number;
  };

  // Fielding team info (Current)
  fieldingTeam: {
    teamId: string;
    teamName: string;
  };

  // Current batsmen
  striker: {
    playerId: string;
    playerName: string;
    runs: number;
    ballsFaced: number;
  } | null;

  nonStriker: {
    playerId: string;
    playerName: string;
    runs: number;
    ballsFaced: number;
  } | null;

  // Current bowler
  bowler: {
    playerId: string;
    playerName: string;
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
  } | null;

  // Match state
  currentOver: number;
  currentBall: number;
  recentBalls: Array<{
    runs: number;
    extras: string;
    extraRuns: number;
    isWicket: boolean;
    wicketType?: string;
  }>;
  overs?: Array<{
    overNumber: number;
    runs: number;
    wickets: number;
    balls: Array<{
      runs: number;
      extras: string;
      extraRuns: number;
      isWicket: boolean;
      wicketType?: string;
    }>;
  }>;

  // Innings Data for Scorecard Tab (actual format from backend)
  battingScorecard?: Array<{
    id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: string;
    isOut: boolean;
    dismissal: string;
    status: 'batting' | 'out' | 'did_not_bat';
  }>;

  bowlingScorecard?: Array<{
    id: string;
    name: string;
    overs: number;
    balls: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: string;
  }>;

  extras?: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };

  firstInningsTotal?: {
    runs: number;
    wickets: number;
    overs: string;
  };

  // Second innings specific
  target?: number;
  ballsRemaining?: number;
  runsNeeded?: number;
  requiredRunRate?: string;

  // Legacy scorecards array (for backward compatibility)
  scorecards?: Array<{
    inningsNumber: number;
    battingTeamName: string;
    runs: number;
    wickets: number;
    overs: string;
    batting: Array<{
      id: string;
      name: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: string;
      isOut: boolean;
      dismissal: string;
      status: 'batting' | 'out' | 'did_not_bat';
    }>;
    bowling: Array<{
      id: string;
      name: string;
      overs: number;
      balls: number;
      maidens: number;
      runs: number;
      wickets: number;
      economy: string;
    }>;
    extras: {
      wides: number;
      noBalls: number;
      byes: number;
      legByes: number;
      total: number;
    };
  }>;
  timestamp?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
