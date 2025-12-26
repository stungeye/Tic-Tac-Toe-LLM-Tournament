# TicTacToe AI Tournament - Copilot Instructions

This is a TypeScript project that runs tournaments between OpenAI language models playing tic-tac-toe. Supports both traditional chat completions and the new responses API (reasoning models).

## Project Structure

- `src/main.ts` - Entry point and configuration loading
- `src/game.ts` - Tic-tac-toe game logic
- `src/ai-player.ts` - Dual API integration (chat/responses modes)
- `src/tournament.ts` - Tournament management and orchestration
- `src/logger.ts` - File logging and statistics generation
- `src/analyze-results.ts` - Post-tournament analysis tool
- `src/list-models.ts` - List available OpenAI models
- `src/types.ts` - TypeScript type definitions
- `config.json` - Tournament configuration (gitignored)
- `config.example.json` - Example configuration template
- `logs/matches/*.json` - Individual match logs
- `logs/statistics.json` - Tournament statistics summary
- `logs/outcomes.json` - Match outcomes summary
- `logs_archive/*.tar.gz` - Archived logs

## Key Features

- Dual API mode support: `chat` and `responses` (reasoning models)
- Reasoning models with configurable effort: low, medium, high
- Separate system prompts for chat vs reasoning models
- Models uniquely identified by: `${id}-${apiMode}-${reasoningEffort}`
- Multi-model tournaments with configurable rounds
- Comprehensive logging of matches and conversations
- Enhanced error tracking including API timeouts
- Statistics generation and rankings
- Analysis tool for existing results
- Board coordinates: (0,0) top-left to (2,2) bottom-right

## API Modes

### Chat Mode (`apiMode: "chat"`)

- Uses `client.chat.completions.create()`
- System role for prompts
- Detailed prompt with verification steps
- Models need 512+ max tokens for reasoning text

### Responses Mode (`apiMode: "responses"`)

- Uses `client.chat.completions.create()` with responses format
- Developer role instead of system role
- Minimal prompt (reasoning is internal)
- Response is just "row,col" (3 characters)
- Requires 2048-10000 max tokens
- Configurable `reasoningEffort`: "low" | "medium" | "high"

## Configuration Structure

```typescript
{
  systemPrompt: string;              // For chat mode models
  responsesSystemPrompt: string;     // For responses mode models
  models: Array<{
    id: string;                      // Base model ID (e.g., "gpt-5.1")
    name: string;
    apiMode: "chat" | "responses";
    apiKey: string;
    maxTokens: number;               // 512 for chat, 2048-10000 for responses
    reasoningEffort?: "low" | "medium" | "high";  // Only for responses mode
  }>;
  tournament: {
    rounds: number;
    timeoutMs: number;               // 120000ms recommended for reasoning
    maxRetries: number;
    backoffMultiplier: number;
  };
  logging: { ... };
}
```

## Invalid Move Types

Tracked in statistics:

- `blank` - Empty/whitespace responses
- `invalid_syntax` - Doesn't match "row,col" format
- `outside_board` - Coordinates outside 0-2 range
- `occupied_cell` - Cell already taken
- `negative_coordinates` - Negative values
- `api_error` - API timeout or error

## Development Guidelines

- Use TypeScript strict mode
- Import types with `import type` syntax
- Handle API timeouts and errors gracefully (tracked as `api_error`)
- Log all match data for analysis
- Follow coordinate system: row,col format (0-2 range)
- Parse AI responses flexibly for move extraction
- Reasoning models need higher timeout and token limits
- Model identification includes API mode and reasoning effort
- Keep `config.json` gitignored (contains API keys)
- Use `config.example.json` as template with placeholder keys

## NPM Scripts

- `npm run tournament` - Run full tournament
- `npm run analyze` - Analyze existing outcomes.json
- `npm run list-models` - List available OpenAI models
- `npm run clear-logs` - Delete logs directory
- `npm run archive-logs` - Archive logs with timestamp
