import { promises as fs } from "fs";
import { TournamentManager } from "./tournament.js";
import type { Config } from "./types.js";

async function loadConfig(): Promise<Config> {
  try {
    const configData = await fs.readFile("config.json", "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error(
      "❌ Failed to load config.json:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log("🤖 TicTacToe AI Tournament");
  console.log("═".repeat(30));

  try {
    // Load configuration
    const config = await loadConfig();

    // Validate configuration
    if (!config.models || config.models.length < 2) {
      console.error("❌ Configuration must include at least 2 models");
      process.exit(1);
    }

    // Check for missing API keys
    const missingKeys = config.models.filter(
      (model) => !model.apiKey || model.apiKey === "your-openai-api-key-here"
    );
    if (missingKeys.length > 0) {
      console.error("❌ The following models are missing API keys:");
      missingKeys.forEach((model) => console.error(`   - ${model.id}`));
      console.error("Please update config.json with valid API keys");
      process.exit(1);
    }

    console.log(`🎯 Loaded ${config.models.length} models:`);
    config.models.forEach((model) => {
      console.log(`   - ${model.name} (${model.id})`);
    });

    console.log(`🔄 ${config.tournament.rounds} rounds per matchup`);
    console.log(`⏱️  ${config.tournament.timeoutMs}ms timeout per move\n`);

    // Initialize and run tournament
    const tournament = new TournamentManager(config);
    await tournament.initialize();
    await tournament.runTournament();
    
    // Ensure clean exit
    process.exit(0);
  } catch (error) {
    console.error(
      "💥 Tournament failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the tournament
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
