import OpenAI from "openai";
import type {
  APIConversation,
  InvalidMoveType,
  Model,
  Player,
} from "./types.js";

export class AIPlayer {
  private openai: OpenAI;
  private model: Model;
  private systemPrompt: string;

  constructor(model: Model, systemPrompt: string) {
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.openai = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.apiUrl.replace("/chat/completions", ""),
    });
  }

  async makeMove(
    player: Player,
    boardState: string,
    moveHistory: string[],
    timeoutMs: number
  ): Promise<{
    move: { row: number; col: number } | null;
    conversation: APIConversation;
    invalidReason?: InvalidMoveType;
  }> {
    const messages = [
      {
        role: "system" as const,
        content: this.systemPrompt,
      },
      {
        role: "user" as const,
        content: this.formatGameState(player, boardState, moveHistory),
      },
    ];

    const conversation: APIConversation = {
      messages: [...messages],
      timestamp: Date.now(),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Determine which token parameter to use based on model
      const usesMaxCompletionTokens =
        this.model.id.startsWith("gpt-5") ||
        this.model.id.startsWith("o3") ||
        this.model.id.startsWith("o4");

      const requestParams: any = {
        model: this.model.id,
        messages,
        // Use temperature=1 for all models to ensure fair comparison
        // (newer models only support default temperature of 1)
        temperature: 1,
      };

      if (usesMaxCompletionTokens) {
        requestParams.max_completion_tokens = 300;
      } else {
        requestParams.max_tokens = 300;
      }

      const response = await this.openai.chat.completions.create(
        requestParams,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content?.trim();
      conversation.response = content || "";

      if (!content) {
        return { move: null, conversation, invalidReason: "blank" };
      }

      const { move, invalidReason } = this.parseMove(content);
      return { move, conversation, invalidReason };
    } catch (error) {
      conversation.error =
        error instanceof Error ? error.message : String(error);
      return { move: null, conversation };
    }
  }

  private formatGameState(
    player: Player,
    boardState: string,
    moveHistory: string[]
  ): string {
    let message = `You are player ${player}.\n\n`;
    message += `Current board state:\n${boardState}\n\n`;

    if (moveHistory.length > 0) {
      message += `Move history:\n${moveHistory.join("\n")}\n\n`;
    }

    message +=
      'Make your move by responding with coordinates in the format "row,col" (e.g., "1,2"). You may think through your strategy, but place your final move on the last line.';
    return message;
  }

  private parseMove(response: string): {
    move: { row: number; col: number } | null;
    invalidReason?: InvalidMoveType;
  } {
    // Extract the last non-empty line for chain-of-thought support
    const lines = response.trim().split("\n");
    const lastLine = lines[lines.length - 1].trim();

    // Look for patterns like "1,2" or "1, 2" or "(1,2)" in the last line only
    const patterns = [
      /row\s*(-?\d+)\D+col\s*(-?\d+)/i,
      /\((-?\d+)\s*,\s*(-?\d+)\)/,
      /(-?\d+)\s*,\s*(-?\d+)/,
      /(-?\d+)\s+(-?\d+)/,
    ];

    for (const pattern of patterns) {
      const match = lastLine.match(pattern);
      if (match) {
        const row = Number.parseInt(match[1], 10);
        const col = Number.parseInt(match[2], 10);

        if (Number.isNaN(row) || Number.isNaN(col)) {
          return { move: null, invalidReason: "invalid_syntax" };
        }

        if (row < 0 || col < 0) {
          return { move: null, invalidReason: "negative_coordinates" };
        }

        if (row > 2 || col > 2) {
          return { move: null, invalidReason: "outside_board" };
        }

        return { move: { row, col } };
      }
    }

    if (/\d/.test(lastLine)) {
      return { move: null, invalidReason: "invalid_syntax" };
    }

    return { move: null, invalidReason: "invalid_syntax" };
  }

  getModelId(): string {
    return this.model.id;
  }

  getModelName(): string {
    return this.model.name;
  }
}
