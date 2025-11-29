import { promises as fs } from "fs";
import { dirname } from "path";
import type {
  MatchOutcome,
  MatchResult,
  TournamentStats,
  ModelStats,
} from "./types.js";

export class Logger {
  private matchesDir: string;
  private outcomesFile: string;
  private statisticsFile: string;

  constructor(
    matchesDir: string,
    outcomesFile: string,
    statisticsFile: string
  ) {
    this.matchesDir = matchesDir;
    this.outcomesFile = outcomesFile;
    this.statisticsFile = statisticsFile;
  }

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.matchesDir, { recursive: true });
    await fs.mkdir(dirname(this.outcomesFile), { recursive: true });
    await fs.mkdir(dirname(this.statisticsFile), { recursive: true });
  }

  generateMatchId(xModel: string, oModel: string, timestamp: number): string {
    return `${xModel}-vs-${oModel}-${timestamp}`;
  }

  getMatchFileName(matchId: string): string {
    return `${this.matchesDir}/${matchId}.json`;
  }

  async logMatch(result: MatchResult): Promise<void> {
    const fileName = this.getMatchFileName(result.matchId);
    await fs.writeFile(fileName, JSON.stringify(result, null, 2));
  }

  async logOutcome(outcome: MatchOutcome): Promise<void> {
    let outcomes: MatchOutcome[] = [];

    try {
      const data = await fs.readFile(this.outcomesFile, "utf8");
      outcomes = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
    }

    outcomes.push(outcome);
    await fs.writeFile(this.outcomesFile, JSON.stringify(outcomes, null, 2));
  }

  async loadOutcomes(): Promise<MatchOutcome[]> {
    try {
      const data = await fs.readFile(this.outcomesFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async generateStatistics(
    models: string[],
    expectedTotalMatches?: number
  ): Promise<TournamentStats> {
    const outcomes = await this.loadOutcomes();

    const modelStats: Map<string, ModelStats> = new Map();

    // Initialize stats for all models
    for (const modelId of models) {
      modelStats.set(modelId, {
        modelId,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        invalidGames: 0,
        winRate: 0,
        opponents: {},
      });
    }

    // Process outcomes
    for (const outcome of outcomes) {
      const xStats = modelStats.get(outcome.X);
      const oStats = modelStats.get(outcome.O);

      if (!xStats || !oStats) continue;

      // Update total matches
      xStats.totalMatches++;
      oStats.totalMatches++;

      // Initialize opponent stats if needed
      if (!xStats.opponents[outcome.O]) {
        xStats.opponents[outcome.O] = {
          wins: 0,
          losses: 0,
          draws: 0,
          invalid: 0,
        };
      }
      if (!oStats.opponents[outcome.X]) {
        oStats.opponents[outcome.X] = {
          wins: 0,
          losses: 0,
          draws: 0,
          invalid: 0,
        };
      }

      // Update stats based on outcome
      if (outcome.winner === "invalid") {
        xStats.invalidGames++;
        oStats.invalidGames++;
        xStats.opponents[outcome.O].invalid++;
        oStats.opponents[outcome.X].invalid++;
      } else if (outcome.winner === "draw") {
        xStats.draws++;
        oStats.draws++;
        xStats.opponents[outcome.O].draws++;
        oStats.opponents[outcome.X].draws++;
      } else if (outcome.winner === "X") {
        xStats.wins++;
        oStats.losses++;
        xStats.opponents[outcome.O].wins++;
        oStats.opponents[outcome.X].losses++;
      } else if (outcome.winner === "O") {
        xStats.losses++;
        oStats.wins++;
        xStats.opponents[outcome.O].losses++;
        oStats.opponents[outcome.X].wins++;
      }
    }

    // Calculate win rates
    for (const stats of modelStats.values()) {
      const validGames = stats.totalMatches - stats.invalidGames;
      stats.winRate = validGames > 0 ? stats.wins / validGames : 0;
    }

    // Create rankings
    const rankings = Array.from(modelStats.values())
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      })
      .map((stats, index) => ({
        modelId: stats.modelId,
        rank: index + 1,
        winRate: stats.winRate,
        totalWins: stats.wins,
      }));

    const completedMatches = outcomes.filter(
      (o) => o.winner !== "invalid"
    ).length;

    const tournamentStats: TournamentStats = {
      totalMatches: expectedTotalMatches || outcomes.length,
      completedMatches,
      invalidMatches: outcomes.filter((o) => o.winner === "invalid").length,
      models: Array.from(modelStats.values()),
      rankings,
      timestamp: Date.now(),
    };

    await fs.writeFile(
      this.statisticsFile,
      JSON.stringify(tournamentStats, null, 2)
    );
    return tournamentStats;
  }
}
