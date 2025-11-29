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
}

export interface LoggingConfig {
  matchesDir: string;
  outcomesFile: string;
  statisticsFile: string;
}

export type Player = "X" | "O";
export type CellValue = Player | null;
export type Board = CellValue[][];

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
  winner: Player | "draw";
  winnerModel?: string;
  moves: GameMove[];
  conversations: APIConversation[];
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
  models: ModelStats[];
  rankings: Array<{
    modelId: string;
    rank: number;
    winRate: number;
    totalWins: number;
  }>;
  timestamp: number;
}
