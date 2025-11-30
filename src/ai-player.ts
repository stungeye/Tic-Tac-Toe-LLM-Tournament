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
    });
  }

  async makeMove(
    player: Player,
    boardState: string,
    moveHistory: string[],
    timeoutMs: number,
    maxTokens: number
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

      let content: string | undefined;

      if (this.model.apiMode === "responses") {
        // Use responses API for GPT-5 models
        const input = [
          {
            role: "developer" as const,
            content: this.systemPrompt,
          },
          {
            role: "user" as const,
            content: this.formatGameState(player, boardState, moveHistory),
          },
        ];

        const response = await this.openai.responses.create(
          {
            model: this.model.id,
            input,
            reasoning: { effort: this.model.reasoningEffort || "medium" },
            max_output_tokens: maxTokens,
          },
          {
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        content = response.output_text?.trim();
      } else {
        // Use chat completions API for older models
        const usesMaxCompletionTokens =
          this.model.id.startsWith("gpt-5") ||
          this.model.id.startsWith("o3") ||
          this.model.id.startsWith("o4");

        const requestParams: any = {
          model: this.model.id,
          messages,
          temperature: 1,
        };

        if (usesMaxCompletionTokens) {
          requestParams.max_completion_tokens = maxTokens;
        } else {
          requestParams.max_tokens = maxTokens;
        }

        const response = await this.openai.chat.completions.create(
          requestParams,
          {
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        content = response.choices[0]?.message?.content?.trim();
      }

      conversation.response = content || "";

      if (!content) {
        return { move: null, conversation, invalidReason: "blank" };
      }

      const { move, invalidReason } = this.parseMove(content);
      return { move, conversation, invalidReason };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : "UnknownError";

      // Provide more detailed error information
      conversation.error = `[${this.model.apiMode}] ${errorName}: ${errorMessage}`;

      // Check if it was a timeout/abort
      if (errorName === "AbortError" || errorMessage.includes("aborted")) {
        conversation.error += ` (timeout after ${timeoutMs}ms)`;
      }

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

    // Extract empty cells from the board state
    const emptyCells: string[] = [];
    const rows = boardState.split("\n");
    rows.forEach((row, rowIndex) => {
      const cells = row.split(" ");
      cells.forEach((cell, colIndex) => {
        if (cell === "-") {
          emptyCells.push(`(${rowIndex},${colIndex})`);
        }
      });
    });

    message += `Available empty cells: ${emptyCells.join(" ")}\n\n`;

    if (moveHistory.length > 0) {
      message += `Move history:\n${moveHistory.join("\n")}\n\n`;
    }

    message +=
      "REMINDER: Only play in one of the empty cells listed above. Verify your chosen cell shows '-' on the board.";
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
    // Include API mode and reasoning effort (if applicable) to distinguish variants
    let id = `${this.model.id}-${this.model.apiMode}`;
    if (this.model.apiMode === "responses" && this.model.reasoningEffort) {
      id += `-${this.model.reasoningEffort}`;
    }
    return id;
  }

  getModelName(): string {
    let name = `${this.model.name} (${this.model.apiMode})`;
    if (this.model.apiMode === "responses" && this.model.reasoningEffort) {
      name += ` [${this.model.reasoningEffort}]`;
    }
    return name;
  }
}
