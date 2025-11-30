import { TicTacToeGame } from "./game.js";
import { AIPlayer } from "./ai-player.js";
import { Logger } from "./logger.js";
import type {
  Config,
  Model,
  MatchResult,
  MatchOutcome,
  Player,
} from "./types.js";

export class TournamentManager {
  private config: Config;
  private logger: Logger;
  private models: Model[];

  constructor(config: Config) {
    this.config = config;
    this.logger = new Logger(
      config.logging.matchesDir,
      config.logging.outcomesFile,
      config.logging.statisticsFile
    );
    this.models = config.models;
  }

  async initialize(): Promise<void> {
    await this.logger.ensureDirectories();
  }

  private generateMatchups(): Array<{ xModel: Model; oModel: Model }> {
    const matchups: Array<{ xModel: Model; oModel: Model }> = [];

    // Generate all unique pairs, with each pair playing both ways (A vs B and B vs A)
    for (let i = 0; i < this.models.length; i++) {
      for (let j = 0; j < this.models.length; j++) {
        if (i !== j) {
          matchups.push({
            xModel: this.models[i],
            oModel: this.models[j],
          });
        }
      }
    }

    return matchups;
  }

  private async playMatch(xModel: Model, oModel: Model): Promise<MatchResult> {
    const game = new TicTacToeGame();
    const xPlayer = new AIPlayer(xModel, this.config.systemPrompt);
    const oPlayer = new AIPlayer(oModel, this.config.systemPrompt);

    const matchId = this.logger.generateMatchId(
      xModel.id,
      oModel.id,
      Date.now()
    );
    const startTime = Date.now();

    const result: MatchResult = {
      matchId,
      X: xModel.id,
      O: oModel.id,
      winner: "invalid",
      moves: [],
      conversations: [],
      invalidMoves: [],
      duration: 0,
      timestamp: startTime,
    };

    console.log(`🎮 Starting match: ${xModel.name} (X) vs ${oModel.name} (O)`);

    while (!game.isGameOver()) {
      const currentPlayer = game.getCurrentPlayer();
      const aiPlayer = currentPlayer === "X" ? xPlayer : oPlayer;

      const boardState = game.getBoardString();
      const moveHistory = game
        .getMoves()
        .map((move) => `${move.player}: ${move.row},${move.col}`);

      console.log(
        `  ${currentPlayer} (${aiPlayer.getModelName()}) is thinking...`
      );

      try {
        const {
          move,
          conversation,
          invalidReason: parseError,
        } = await aiPlayer.makeMove(
          currentPlayer,
          boardState,
          moveHistory,
          this.config.tournament.timeoutMs
        );

        result.conversations.push(conversation);

        if (!move) {
          if (parseError) {
            const invalidDetails =
              conversation.response && conversation.response.trim().length > 0
                ? conversation.response
                : parseError;
            result.invalidMoves.push({
              player: currentPlayer,
              type: parseError,
              details: invalidDetails,
            });
            result.invalidReason = `${currentPlayer}: ${parseError}`;
            console.log(
              `  ❌ Invalid move (${parseError}) from ${aiPlayer.getModelName()}`
            );
          } else {
            const apiError = conversation.error
              ? `api_error - ${conversation.error}`
              : "api_error";
            result.invalidReason = `${currentPlayer}: ${apiError}`;
            console.log(
              `  ❌ Error from ${aiPlayer.getModelName()}: ${
                result.invalidReason
              }`
            );
          }
          break;
        }

        console.log(`  ${currentPlayer}: ${move.row},${move.col}`);

        if (!game.makeMove(move.row, move.col)) {
          result.invalidMoves.push({
            player: currentPlayer,
            type: "occupied_cell",
            details: `(${move.row},${move.col})`,
          });
          result.invalidReason = `${currentPlayer}: occupied_cell (${move.row},${move.col})`;
          console.log(
            `  ❌ Invalid move coordinates from ${aiPlayer.getModelName()}`
          );
          break;
        }
      } catch (error) {
        result.invalidReason = `${currentPlayer} encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.log(
          `  ❌ Error from ${aiPlayer.getModelName()}: ${result.invalidReason}`
        );
        break;
      }
    }

    result.moves = game.getMoves();
    result.duration = Date.now() - startTime;

    if (!result.invalidReason) {
      result.winner = game.checkWinner() as Player | "draw";

      // Set winnerModel for easy programmatic access
      if (result.winner === "X") {
        result.winnerModel = result.X;
      } else if (result.winner === "O") {
        result.winnerModel = result.O;
      }

      console.log(
        `  🏆 Result: ${
          result.winner === "draw" ? "Draw" : `${result.winner} wins`
        }`
      );
    }

    return result;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForUserInput(): Promise<void> {
    console.log(
      "\n⏸️  Too many consecutive failures. Press Enter to continue..."
    );
    return new Promise<void>((resolve) => {
      process.stdin.once("data", () => {
        resolve();
      });
    });
  }

  async runTournament(): Promise<void> {
    console.log("🏁 Starting tournament...");
    console.log(
      `📊 ${this.models.length} models, ${this.config.tournament.rounds} rounds each`
    );

    const matchups = this.generateMatchups();
    const totalMatches = matchups.length * this.config.tournament.rounds;
    let completedMatches = 0;

    console.log(`🎯 Total matches to play: ${totalMatches}\n`);

    for (let round = 1; round <= this.config.tournament.rounds; round++) {
      console.log(`\n🔄 Round ${round}/${this.config.tournament.rounds}`);

      for (const { xModel, oModel } of matchups) {
        let apiRetries = 0;
        let backoffTime = 1000; // Start with 1 second
        let matchCompleted = false;

        while (!matchCompleted) {
          try {
            const result = await this.playMatch(xModel, oModel);

            // Log the match
            await this.logger.logMatch(result);

            // Log the outcome
            const outcome: MatchOutcome = {
              matchId: result.matchId,
              X: result.X,
              O: result.O,
              winner: result.invalidReason ? "invalid" : result.winner,
              winnerModel: result.winnerModel,
              invalidReason: result.invalidReason,
              matchFile: this.logger.getMatchFileName(result.matchId),
              timestamp: result.timestamp,
            };

            await this.logger.logOutcome(outcome);

            if (!result.invalidReason) {
              // Valid match completed successfully
              completedMatches++;
              matchCompleted = true;
              console.log(
                `✅ Match completed (${completedMatches}/${totalMatches})`
              );
            } else {
              // Invalid match - check if it's a simple invalid move or API error
              const invalidMoveTypes = [
                "blank",
                "invalid_syntax",
                "outside_board",
                "occupied_cell",
                "negative_coordinates",
              ];

              const isInvalidMove = invalidMoveTypes.some((type) =>
                result.invalidReason?.includes(type)
              );

              if (isInvalidMove) {
                // Simple invalid move - retry immediately without counting as API failure
                console.log(
                  `🔄 Invalid move (${result.invalidReason}), retrying immediately...`
                );
                continue;
              } else {
                // API error - count as failure
                apiRetries++;
                console.log(
                  `❌ API error (attempt ${apiRetries}/${this.config.tournament.maxRetries}): ${result.invalidReason}`
                );

                if (apiRetries >= this.config.tournament.maxRetries) {
                  console.log(
                    `⏸️  Max retries (${this.config.tournament.maxRetries}) reached. Press Enter to continue...`
                  );
                  await this.waitForUserInput();
                  apiRetries = 0; // Reset after user intervention
                }

                console.log(`⏳ Retrying in ${backoffTime}ms...`);
                await this.sleep(backoffTime);
                backoffTime *= this.config.tournament.backoffMultiplier;
              }
            }
          } catch (error) {
            // Unexpected system error
            apiRetries++;
            console.log(
              `💥 Unexpected error (attempt ${apiRetries}/${
                this.config.tournament.maxRetries
              }): ${error instanceof Error ? error.message : String(error)}`
            );

            if (apiRetries >= this.config.tournament.maxRetries) {
              console.log(
                `⏸️  Max retries (${this.config.tournament.maxRetries}) reached. Press Enter to continue...`
              );
              await this.waitForUserInput();
              apiRetries = 0; // Reset after user intervention
            }

            console.log(`⏳ Retrying in ${backoffTime}ms...`);
            await this.sleep(backoffTime);
            backoffTime *= this.config.tournament.backoffMultiplier;
          }
        }
      }
    }

    console.log("\n🎊 Tournament completed!");
    console.log("📈 Generating final statistics...\n");

    // Generate and display final statistics
    const allMatchups = this.generateMatchups();
    const expectedTotalMatches =
      allMatchups.length * this.config.tournament.rounds;
    const stats = await this.logger.generateStatistics(
      this.models.map((m) => m.id),
      expectedTotalMatches
    );
    this.displayStatistics(stats);
  }

  private displayStatistics(stats: any): void {
    console.log("🏆 FINAL TOURNAMENT RESULTS");
    console.log("═".repeat(50));
    console.log(`📊 Total Matches: ${stats.totalMatches}`);
    console.log(`✅ Completed: ${stats.completedMatches}`);
    console.log(`❌ Invalid: ${stats.invalidMatches}`);
    console.log();

    console.log("🏅 RANKINGS:");
    console.log("-".repeat(50));
    for (const ranking of stats.rankings) {
      const model = stats.models.find(
        (m: any) => m.modelId === ranking.modelId
      );
      const winRate = (ranking.winRate * 100).toFixed(1);
      console.log(`${ranking.rank}. ${ranking.modelId}`);
      console.log(`   Win Rate: ${winRate}% (${ranking.totalWins} wins)`);
      console.log(
        `   W: ${model.wins} | L: ${model.losses} | D: ${model.draws} | I: ${model.invalidGames}`
      );
      console.log();
    }

    console.log("❌ INVALID MOVES ANALYSIS:");
    console.log("-".repeat(50));
    console.log(`📊 Overall Invalid Moves: ${stats.overallInvalidMoves.total}`);
    console.log(`   Blank responses: ${stats.overallInvalidMoves.blank}`);
    console.log(
      `   Invalid syntax: ${stats.overallInvalidMoves.invalid_syntax}`
    );
    console.log(`   Outside board: ${stats.overallInvalidMoves.outside_board}`);
    console.log(
      `   Occupied cells: ${stats.overallInvalidMoves.occupied_cell}`
    );
    console.log(
      `   Negative coords: ${stats.overallInvalidMoves.negative_coordinates}`
    );
    console.log();

    for (const model of stats.models) {
      if (model.invalidMoves.total > 0) {
        console.log(
          `${model.modelId}: ${model.invalidMoves.total} invalid moves`
        );
        console.log(
          `   Blank: ${model.invalidMoves.blank} | Syntax: ${model.invalidMoves.invalid_syntax} | Outside: ${model.invalidMoves.outside_board}`
        );
        console.log(
          `   Occupied: ${model.invalidMoves.occupied_cell} | Negative: ${model.invalidMoves.negative_coordinates}`
        );
        console.log();
      }
    }

    console.log("🆚 HEAD-TO-HEAD RECORDS:");
    console.log("-".repeat(50));
    for (const model of stats.models) {
      console.log(`${model.modelId}:`);
      for (const [opponent, record] of Object.entries(model.opponents)) {
        const r = record as {
          wins: number;
          losses: number;
          draws: number;
          invalid: number;
        };
        const total = r.wins + r.losses + r.draws;
        if (total > 0) {
          console.log(
            `  vs ${opponent}: ${r.wins}W-${r.losses}L-${r.draws}D-${r.invalid}I`
          );
        }
      }
      console.log();
    }

    console.log(`📁 Detailed logs saved to:`);
    console.log(`   Matches: ${this.config.logging.matchesDir}/`);
    console.log(`   Outcomes: ${this.config.logging.outcomesFile}`);
    console.log(`   Statistics: ${this.config.logging.statisticsFile}`);
  }
}
