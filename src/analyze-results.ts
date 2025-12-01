import { Logger } from "./logger.js";
import { readFile } from "fs/promises";
import type { Config } from "./types.js";

async function analyzeResults() {
  try {
    // Load config to get model definitions and logging paths
    const configData = await readFile("config.json", "utf-8");
    const config: Config = JSON.parse(configData);

    // Create logger instance
    const logger = new Logger(
      config.logging.matchesDir,
      config.logging.outcomesFile,
      config.logging.statisticsFile
    );

    // Get model IDs from outcomes file
    const outcomesData = await readFile(config.logging.outcomesFile, "utf-8");
    const outcomes = JSON.parse(outcomesData);

    // Extract unique model IDs from the outcomes
    const modelIds = new Set<string>();
    for (const outcome of outcomes) {
      modelIds.add(outcome.X);
      modelIds.add(outcome.O);
    }

    const modelIdArray = Array.from(modelIds);

    console.log(`\n📋 Analyzing ${outcomes.length} matches...\n`);

    // Generate statistics (automatically saves to file)
    const stats = await logger.generateStatistics(modelIdArray);

    // Display statistics (same format as tournament)
    displayStatistics(stats);

    console.log(`\n💾 Statistics saved to ${config.logging.statisticsFile}\n`);
  } catch (error) {
    console.error("Error analyzing results:", error);
    process.exit(1);
  }
}

function displayStatistics(stats: any): void {
  console.log("🏆 TOURNAMENT RESULTS ANALYSIS");
  console.log("═".repeat(50));
  console.log(`📊 Total Matches: ${stats.totalMatches}`);
  console.log(`✅ Completed: ${stats.completedMatches}`);
  console.log(`❌ Invalid: ${stats.invalidMatches}`);
  console.log();

  console.log("🏅 RANKINGS:");
  console.log("-".repeat(50));
  for (const ranking of stats.rankings) {
    const model = stats.models.find((m: any) => m.modelId === ranking.modelId);
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
  console.log(`   Invalid syntax: ${stats.overallInvalidMoves.invalid_syntax}`);
  console.log(`   Outside board: ${stats.overallInvalidMoves.outside_board}`);
  console.log(`   Occupied cells: ${stats.overallInvalidMoves.occupied_cell}`);
  console.log(
    `   Negative coords: ${stats.overallInvalidMoves.negative_coordinates}`
  );
  console.log(`   API errors: ${stats.overallInvalidMoves.api_error}`);
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
        `   Occupied: ${model.invalidMoves.occupied_cell} | Negative: ${model.invalidMoves.negative_coordinates} | API: ${model.invalidMoves.api_error}`
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
}

analyzeResults();
