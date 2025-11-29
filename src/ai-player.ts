import OpenAI from "openai";
import type { APIConversation, Model } from "./types.js";

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
    boardState: string,
    moveHistory: string[],
    timeoutMs: number
  ): Promise<{
    move: { row: number; col: number } | null;
    conversation: APIConversation;
  }> {
    const messages = [
      {
        role: "system" as const,
        content: this.systemPrompt,
      },
      {
        role: "user" as const,
        content: this.formatGameState(boardState, moveHistory),
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
        requestParams.max_completion_tokens = 50;
      } else {
        requestParams.max_tokens = 50;
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
        return { move: null, conversation };
      }

      const move = this.parseMove(content);
      return { move, conversation };
    } catch (error) {
      conversation.error =
        error instanceof Error ? error.message : String(error);
      return { move: null, conversation };
    }
  }

  private formatGameState(boardState: string, moveHistory: string[]): string {
    let message = `Current board state:\n${boardState}\n\n`;

    if (moveHistory.length > 0) {
      message += `Move history:\n${moveHistory.join("\n")}\n\n`;
    }

    message +=
      'Make your move by responding with coordinates in the format "row,col" (e.g., "1,2").';
    return message;
  }

  private parseMove(response: string): { row: number; col: number } | null {
    // Look for patterns like "1,2" or "1, 2" or "(1,2)"
    const patterns = [
      /(\d),\s*(\d)/,
      /\((\d),\s*(\d)\)/,
      /(\d)\s*,\s*(\d)/,
      /row\s*(\d).*col\s*(\d)/i,
      /(\d)\s+(\d)/,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);

        if (row >= 0 && row <= 2 && col >= 0 && col <= 2) {
          return { row, col };
        }
      }
    }

    return null;
  }

  getModelId(): string {
    return this.model.id;
  }

  getModelName(): string {
    return this.model.name;
  }
}
