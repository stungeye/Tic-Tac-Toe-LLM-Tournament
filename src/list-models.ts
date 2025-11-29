#!/usr/bin/env node

import OpenAI from "openai";

async function listModels(apiKey: string): Promise<void> {
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    console.error("❌ Please provide a valid OpenAI API key");
    console.log("Usage: npm run list-models <api-key>");
    console.log("   or: npx tsx src/list-models.ts <api-key>");
    process.exit(1);
  }

  console.log("🔍 Fetching available OpenAI models...\n");

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.models.list();

    // Filter for chat models (typically used for tic-tac-toe)
    const chatModels = response.data
      .filter(
        (model) =>
          model.id.includes("gpt") ||
          model.id.includes("chat") ||
          model.id.includes("turbo")
      )
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log("🤖 Available Chat Models:");
    console.log("═".repeat(50));

    if (chatModels.length === 0) {
      console.log("No chat models found.");
    } else {
      chatModels.forEach((model) => {
        console.log(`📋 ${model.id}`);
        if (model.owned_by && model.owned_by !== "system") {
          console.log(`   Owner: ${model.owned_by}`);
        }
        if (model.created) {
          const date = new Date(model.created * 1000).toLocaleDateString();
          console.log(`   Created: ${date}`);
        }
        console.log();
      });
    }

    console.log("📊 All Available Models:");
    console.log("═".repeat(50));

    response.data
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((model) => {
        console.log(`• ${model.id}`);
      });

    console.log(
      `\n✅ Found ${response.data.length} total models (${chatModels.length} chat models)`
    );
  } catch (error) {
    console.error(
      "❌ Failed to fetch models:",
      error instanceof Error ? error.message : String(error)
    );

    if (error instanceof Error && error.message.includes("401")) {
      console.error(
        "💡 Check that your API key is valid and has the correct permissions"
      );
    }

    process.exit(1);
  }
}

// Get API key from command line argument or environment
const apiKey = process.argv[2] || process.env.OPENAI_API_KEY || "";

listModels(apiKey);
