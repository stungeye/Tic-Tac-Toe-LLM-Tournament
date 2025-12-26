# TicTacToe AI Tournament

A TypeScript system that runs tournaments between different OpenAI language models playing tic-tac-toe against each other. Features support for both traditional chat completions and the new responses API (reasoning models).

## Features

- **Dual API Mode Support**: Configure models with `chat` or `responses` API modes
- **Reasoning Models**: Support for GPT-5.1 with configurable reasoning effort (low/medium/high)
- **Multi-Model Support**: Configure any number of OpenAI models to compete
- **Round-Robin Tournament**: Every model plays against every other model N times
- **Comprehensive Logging**: Full match logs with moves and API conversations
- **Error Handling**: Robust timeout, retry, and failure management
- **Statistics & Rankings**: Detailed performance metrics and head-to-head records
- **Analysis Tool**: Analyze existing tournament results without re-running matches
- **Configurable**: JSON-based configuration for models, tournament settings, and logging

## Quick Start

1. **Copy the example config**:

   ```bash
   cp config.example.json config.json
   ```

2. **Add your OpenAI API key** to `config.json`

3. **Run the tournament**:
   ```bash
   npm run tournament
   ```

## Configuration

### Example Configuration

```json
{
  "systemPrompt": "Detailed prompt for chat mode models...",
  "responsesSystemPrompt": "Minimal prompt for reasoning models...",
  "models": [
    {
      "id": "gpt-5.1",
      "name": "GPT-5.1 Thinking",
      "apiMode": "responses",
      "apiKey": "your-openai-api-key-here",
      "maxTokens": 10000,
      "reasoningEffort": "medium"
    },
    {
      "id": "gpt-5.1",
      "name": "GPT-5.1 Chat",
      "apiMode": "chat",
      "apiKey": "your-openai-api-key-here",
      "maxTokens": 512
    }
  ],
  "tournament": {
    "rounds": 25,
    "timeoutMs": 120000,
    "maxRetries": 15,
    "backoffMultiplier": 2
  },
  "logging": {
    "matchesDir": "logs/matches",
    "outcomesFile": "logs/outcomes.json",
    "statisticsFile": "logs/statistics.json"
  }
}
```

### Model Configuration

- `id`: Unique identifier for the base model (e.g., "gpt-5.1")
- `name`: Human-readable display name
- `apiMode`: Either `"chat"` or `"responses"` (for reasoning models)
- `apiKey`: OpenAI API authentication key
- `maxTokens`: Maximum tokens per response (512-10000 depending on mode)
- `reasoningEffort`: (Optional) For responses mode: `"low"`, `"medium"`, or `"high"`

**Note**: Models are uniquely identified by `${id}-${apiMode}-${reasoningEffort}`, allowing the same base model with different configurations to compete.

### System Prompts

- `systemPrompt`: Detailed prompt for chat mode models with verification steps
- `responsesSystemPrompt`: Minimal prompt for reasoning models (they think internally)

### Tournament Settings

- `rounds`: Number of times each matchup is played
- `timeoutMs`: Maximum time per move in milliseconds (120000ms recommended for reasoning models)
- `maxRetries`: Retry attempts for failed matches
- `backoffMultiplier`: Exponential backoff multiplier for retries

### Game Rules

- Board coordinates: (0,0) top-left to (2,2) bottom-right
- X always goes first, then alternates with O
- Invalid moves (out of bounds, occupied cells, API errors) invalidate the match
- Invalid matches are retried up to maxRetries times
- Timeouts cancel the current match

## Output Files

The system generates several output files in the `logs/` directory:

### Match Files (`logs/matches/`)

Individual JSON files for each match containing:

- Complete move history with timestamps
- Full API conversations (requests and responses)
- Match metadata (players, duration, outcome)
- Invalid move tracking with error types
- Error information for invalid matches

Example filename: `gpt-5.1-chat-vs-gpt-5.1-responses-medium-1764543110834.json`

### Outcomes Log (`logs/outcomes.json`)

Consolidated list of all match outcomes:

```json
[
  {
    "matchId": "gpt-5.1-chat-vs-gpt-5.1-responses-medium-1764543110834",
    "X": "gpt-5.1-chat",
    "O": "gpt-5.1-responses-medium",
    "winner": "O",
    "winnerModel": "gpt-5.1-responses-medium",
    "matchFile": "logs/matches/gpt-5.1-chat-vs-gpt-5.1-responses-medium-1764543110834.json",
    "timestamp": 1764543110834
  }
]
```

### Statistics (`logs/statistics.json`)

Comprehensive tournament statistics:

- Overall tournament metrics (completed, invalid matches)
- Invalid move breakdown by type (blank, invalid_syntax, outside_board, occupied_cell, api_error)
- Per-model performance (wins, losses, draws, invalid games, win rates)
- Head-to-head records between all model pairs
- Rankings sorted by win rate

## Available Scripts

- `npm run tournament` - Run the full tournament
- `npm run analyze` - Analyze existing results from outcomes.json
- `npm run list-models` - List available OpenAI models
- `npm run clear-logs` - Delete logs directory
- `npm run archive-logs` - Archive logs with timestamp
- `npm run build` - Build the project
- `npm run dev` - Start Vite dev server

## Error Handling

The system includes several layers of error handling:

1. **API Timeouts**: Configurable per-move timeout (120s for reasoning models)
2. **Invalid Moves**: Automatic match invalidation and retry
3. **API Errors**: Tracked as `api_error` type in statistics
4. **Exponential Backoff**: Progressive delays between retries
5. **Comprehensive Logging**: All errors logged with context

Invalid move types tracked:

- `blank`: Empty or whitespace-only responses
- `invalid_syntax`: Response doesn't match "row,col" format
- `outside_board`: Coordinates outside 0-2 range
- `occupied_cell`: Move to already occupied cell
- `negative_coordinates`: Negative row or column values
- `api_error`: API timeout or error

## Tournament Results

Based on testing with GPT-5.1 models:

- **Medium effort reasoning**: 46.3% win rate
- **Low effort reasoning**: 42.5% win rate
- **Chat mode**: 10.0% win rate

Key findings:

- Reasoning models significantly outperform chat models
- Very low invalid move rate across all models
- Higher reasoning effort correlates with better performance

## Requirements

- Node.js 18+
- OpenAI API key with access to desired models
- NPM packages: `openai@^6.9.1`, `fs-extra@^11.3.2`, `tsx@^4.20.6`

## Architecture

The system consists of several key components:

- **TicTacToeGame** (`src/game.ts`): Core game logic and board management
- **AIPlayer** (`src/ai-player.ts`): Dual API integration (chat/responses) and move parsing
- **TournamentManager** (`src/tournament.ts`): Tournament orchestration and match scheduling
- **Logger** (`src/logger.ts`): File system operations and statistics generation
- **Types** (`src/types.ts`): TypeScript interfaces including Model, Config, InvalidMoveType
- **AnalyzeResults** (`src/analyze-results.ts`): Post-tournament analysis tool

## API Integration

The system supports two OpenAI API modes:

### Chat Mode (`apiMode: "chat"`)

- Uses traditional chat completions API
- System prompt with detailed instructions and verification steps
- Responses include reasoning text followed by move coordinates

### Responses Mode (`apiMode: "responses"`)

- Uses new responses API for reasoning models (GPT-5.1)
- Developer role instead of system role
- Minimal prompt (reasoning happens internally)
- Response is just the move coordinates (3 characters)
- Configurable reasoning effort: low, medium, or high

## License

UNLICENSE: This is free and unencumbered software released into the public domain.

See UNLICENSE file for details.
