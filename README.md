# TicTacToe AI Tournament

A TypeScript system that runs tournaments between different OpenAI language models playing tic-tac-toe against each other.

## Features

- **Multi-Model Support**: Configure any number of OpenAI-compatible models to compete
- **Round-Robin Tournament**: Every model plays against every other model N times
- **Comprehensive Logging**: Full match logs with moves and API conversations
- **Error Handling**: Robust timeout, retry, and failure management
- **Statistics & Rankings**: Detailed performance metrics and head-to-head records
- **Configurable**: JSON-based configuration for models, tournament settings, and logging

## Quick Start

1. **Configure your tournament** by editing `config.json`:

   ```json
   {
     "models": [
       {
         "id": "gpt-4o-mini",
         "name": "GPT-4o Mini",
         "apiUrl": "https://api.openai.com/v1/chat/completions",
         "apiKey": "your-actual-openai-api-key"
       },
       {
         "id": "gpt-3.5-turbo",
         "name": "GPT-3.5 Turbo",
         "apiUrl": "https://api.openai.com/v1/chat/completions",
         "apiKey": "your-actual-openai-api-key"
       }
     ],
     "tournament": {
       "rounds": 10,
       "timeoutMs": 30000,
       "maxRetries": 3,
       "backoffMultiplier": 2,
       "pauseOnConsecutiveFailures": 3
     }
   }
   ```

2. **Run the tournament**:
   ```bash
   npm run tournament
   ```

## Configuration

### Models

- `id`: Unique identifier for the model
- `name`: Human-readable display name
- `apiUrl`: OpenAI-compatible API endpoint
- `apiKey`: API authentication key

### Tournament Settings

- `rounds`: Number of times each matchup is played
- `timeoutMs`: Maximum time per move (milliseconds)
- `maxRetries`: Retry attempts for failed matches
- `backoffMultiplier`: Exponential backoff multiplier for retries
- `pauseOnConsecutiveFailures`: Pause after N consecutive failures

### Game Rules

- Board coordinates: (0,0) top-left to (2,2) bottom-right
- X always goes first, then alternates with O
- Invalid moves (out of bounds, occupied cells) invalidate the match
- Invalid matches are retried up to maxRetries times
- Timeouts cancel the current match

## Output Files

The system generates several output files in the `logs/` directory:

### Match Files (`logs/matches/`)

Individual JSON files for each match containing:

- Complete move history with timestamps
- Full API conversations (requests and responses)
- Match metadata (players, duration, outcome)
- Error information for invalid matches

Example filename: `gpt-4o-mini-vs-gpt-3.5-turbo-1701234567890.json`

### Outcomes Log (`logs/outcomes.json`)

Consolidated list of all match outcomes:

```json
[
  {
    "matchId": "gpt-4o-mini-vs-gpt-3.5-turbo-1701234567890",
    "xModel": "gpt-4o-mini",
    "oModel": "gpt-3.5-turbo",
    "winner": "X",
    "matchFile": "logs/matches/gpt-4o-mini-vs-gpt-3.5-turbo-1701234567890.json",
    "timestamp": 1701234567890
  }
]
```

### Statistics (`logs/statistics.json`)

Comprehensive tournament statistics:

- Overall tournament metrics
- Per-model performance (wins, losses, draws, invalid games)
- Win rates and rankings
- Head-to-head records between all model pairs

## Available Scripts

- `npm run tournament` - Run the tournament
- `npm run build` - Build the project
- `npm run dev` - Start Vite dev server (not used for tournament)
- `npx tsx src/main.ts` - Run directly with tsx

## Error Handling

The system includes several layers of error handling:

1. **API Timeouts**: Configurable per-move timeout
2. **Invalid Moves**: Automatic match invalidation and retry
3. **Consecutive Failures**: Automatic pause requiring user input
4. **Exponential Backoff**: Progressive delays between retries
5. **Comprehensive Logging**: All errors logged with context

## Example Tournament Output

```
🤖 TicTacToe AI Tournament
══════════════════════════════
🎯 Loaded 3 models:
   - GPT-4o Mini (gpt-4o-mini)
   - GPT-3.5 Turbo (gpt-3.5-turbo)
   - Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
🔄 5 rounds per matchup
⏱️  30000ms timeout per move

🎯 Total matches to play: 30

🔄 Round 1/5
🎮 Starting match: GPT-4o Mini (X) vs GPT-3.5 Turbo (O)
  X (GPT-4o Mini) is thinking...
  X: 1,1
  O (GPT-3.5 Turbo) is thinking...
  O: 0,0
  ...
  🏆 Result: X wins
✅ Match completed (1/30)
```

## Requirements

- Node.js 18+
- OpenAI API keys (or compatible API endpoint)
- NPM packages: `openai`, `tsx`

## Architecture

The system consists of several key components:

- **TicTacToeGame**: Core game logic and board management
- **AIPlayer**: OpenAI API integration and move parsing
- **TournamentManager**: Tournament orchestration and match scheduling
- **Logger**: File system operations and statistics generation
- **Types**: TypeScript interfaces for type safety

## API Integration

The system uses the OpenAI chat completions API format:

- System prompt explains the game rules and coordinate system
- User messages include current board state and move history
- Assistant responses are parsed for coordinate moves (e.g., "1,2")
- Multiple parsing patterns handle various response formats

## Customization

You can extend the system by:

- Adding support for other LLM providers
- Implementing different game variants
- Customizing the move parsing logic
- Adding new statistics and visualizations
- Integrating with databases or external APIs

## License

MIT License - see LICENSE file for details.
