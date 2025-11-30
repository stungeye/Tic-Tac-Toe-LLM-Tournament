export interface Config {
  systemPrompt: string;
  models: Model[];
  tournament: TournamentConfig;
  logging: LoggingConfig;
}

export interface Model {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
}

export interface TournamentConfig {
  rounds: number;
  timeoutMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  maxTokens: number;
}

export interface LoggingConfig {
  matchesDir: string;
  outcomesFile: string;
  statisticsFile: string;
}

export type Player = "X" | "O";
export type CellValue = Player | null;
export type Board = CellValue[][];
export type InvalidMoveType =
  | "blank"
  | "invalid_syntax"
  | "outside_board"
  | "occupied_cell"
  | "negative_coordinates";

export interface GameMove {
  player: Player;
  row: number;
  col: number;
  timestamp: number;
}

export interface APIConversation {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  response?: string;
  error?: string;
  timestamp: number;
}

export interface MatchResult {
  matchId: string;
  X: string;
  O: string;
  winner: Player | "draw" | "invalid";
  winnerModel?: string;
  moves: GameMove[];
  conversations: APIConversation[];
  invalidMoves: Array<{
    player: Player;
    type: InvalidMoveType;
    details?: string;
  }>;
  duration: number;
  invalidReason?: string;
  timestamp: number;
}

export interface MatchOutcome {
  matchId: string;
  X: string;
  O: string;
  winner: Player | "draw" | "invalid";
  winnerModel?: string;
  invalidReason?: string;
  matchFile: string;
  timestamp: number;
}

export interface ModelStats {
  modelId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  invalidGames: number;
  winRate: number;
  invalidMoves: {
    blank: number;
    invalid_syntax: number;
    outside_board: number;
    occupied_cell: number;
    negative_coordinates: number;
    total: number;
  };
  opponents: Record<
    string,
    {
      wins: number;
      losses: number;
      draws: number;
      invalid: number;
    }
  >;
}

export interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  invalidMatches: number;
  overallInvalidMoves: {
    blank: number;
    invalid_syntax: number;
    outside_board: number;
    occupied_cell: number;
    negative_coordinates: number;
    total: number;
  };
  models: ModelStats[];
  rankings: Array<{
    modelId: string;
    rank: number;
    winRate: number;
    totalWins: number;
  }>;
  timestamp: number;
}
