# TicTacToe AI Tournament - Copilot Instructions

This is a TypeScript project that runs tournaments between OpenAI language models playing tic-tac-toe.

## Project Structure

- `src/main.ts` - Entry point and configuration loading
- `src/game.ts` - Tic-tac-toe game logic
- `src/ai-player.ts` - OpenAI API integration
- `src/tournament.ts` - Tournament management and orchestration
- `src/logger.ts` - File logging and statistics generation
- `src/types.ts` - TypeScript type definitions
- `config.json` - Tournament configuration

## Key Features

- Multi-model tournaments with configurable rounds
- Comprehensive logging of matches and conversations
- Error handling with timeouts and retries
- Statistics generation and rankings
- Board coordinates: (0,0) top-left to (2,2) bottom-right

## Development Guidelines

- Use TypeScript strict mode
- Import types with `import type` syntax
- Handle API timeouts and errors gracefully
- Log all match data for analysis
- Follow coordinate system: row,col format
- Parse AI responses flexibly for move extraction
